import { useCallback, useEffect, useRef, useState } from 'react';

// Google STUN + Cloudflare STUN + a free public TURN relay as fallback for
// players behind strict NAT. TURN only kicks in when a direct peer-to-peer
// connection can't be established.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.google.com:19302' },
  { urls: 'stun:stun2.google.com:19302' },
  { urls: 'stun:stun3.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export default function VoiceChat({ roomId, socket, meName }) {
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]); // [{ socketId, name, state }] state: connecting | connected | reconnecting
  const [speakers, setSpeakers] = useState(() => new Set());

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());        // socketId -> RTCPeerConnection
  const audioElsRef = useRef(new Map());     // socketId -> <audio> element
  const analysersRef = useRef(new Map());    // socketId -> { analyser, data, ctx }
  const restartTimersRef = useRef(new Map()); // socketId -> timeout id
  const speakersRef = useRef(new Set());
  const levelTimerRef = useRef(null);
  const joinedRef = useRef(false);

  // ── Peer management ───────────────────────────────────────────────────
  function closePeer(socketId) {
    const pc = peersRef.current.get(socketId);
    if (pc) { try { pc.close(); } catch (_) {} peersRef.current.delete(socketId); }
    const audio = audioElsRef.current.get(socketId);
    if (audio) { audio.srcObject = null; audioElsRef.current.delete(socketId); }
    const an = analysersRef.current.get(socketId);
    if (an && an.ctx) an.ctx.close().catch(() => {});
    analysersRef.current.delete(socketId);
    const rt = restartTimersRef.current.get(socketId);
    if (rt) { clearTimeout(rt); restartTimersRef.current.delete(socketId); }
  }

  // Force a new ICE negotiation when the audio link drops (transient NAT/firewall blips)
  function restartPeer(socketId) {
    const pc = peersRef.current.get(socketId);
    if (!pc) return;
    try {
      if (typeof pc.restartIce === 'function') {
        pc.restartIce();
      } else {
        // Older browsers: re-offer with iceRestart explicitly
        pc.createOffer({ iceRestart: true })
          .then(o => pc.setLocalDescription(o))
          .then(() => socket.emit('voice_offer', { roomId, to: socketId, sdp: pc.localDescription }))
          .catch(() => {});
      }
    } catch (_) {}
  }

  function setMemberState(socketId, state) {
    setMembers(prev => prev.map(m => m.socketId === socketId ? { ...m, state } : m));
  }

  function makePeer(socketId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onnegotiationneeded = async () => {
      // Only the initiator sends offers; answerers (have-remote-offer) must not
      if (pc.signalingState !== 'stable') return;
      try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('voice_offer', { roomId, to: socketId, sdp: pc.localDescription });
      } catch (err) { console.error('voice offer failed', err); }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('voice_ice', { roomId, to: socketId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState; // new | connecting | connected | disconnected | failed | closed
      if (st === 'closed') return;
      if (st === 'connected') {
        const rt = restartTimersRef.current.get(socketId);
        if (rt) { clearTimeout(rt); restartTimersRef.current.delete(socketId); }
        setMemberState(socketId, 'connected');
      } else if (st === 'disconnected' || st === 'failed') {
        setMemberState(socketId, 'reconnecting');
        // Give it a moment to recover on its own, then force an ICE restart
        if (!restartTimersRef.current.has(socketId)) {
          const t = setTimeout(() => {
            restartTimersRef.current.delete(socketId);
            const p = peersRef.current.get(socketId);
            if (p && (p.connectionState === 'disconnected' || p.connectionState === 'failed')) {
              restartPeer(socketId);
            }
          }, 2500);
          restartTimersRef.current.set(socketId, t);
        }
      } else {
        setMemberState(socketId, 'connecting');
      }
    };
    pc.ontrack = (e) => {
      const stream = e.streams && e.streams[0];
      if (!stream) return;
      let audio = audioElsRef.current.get(socketId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        audioElsRef.current.set(socketId, audio);
      }
      audio.srcObject = stream;
      audio.play().catch(() => {});
      setMemberState(socketId, 'connected');
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analysersRef.current.set(socketId, {
          ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount)
        });
      } catch (_) { /* speaking indicator unavailable — voice still works */ }
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }
    peersRef.current.set(socketId, pc);
    return pc;
  }

  // The newcomer initiates offers (avoids glare). Adding tracks fires
  // onnegotiationneeded, which sends the offer.
  function connectTo(socketId) {
    if (peersRef.current.has(socketId)) return;
    makePeer(socketId);
  }

  // ── Speaking detection (analyser per remote stream) ──────────────────
  function startLevelMonitor() {
    if (levelTimerRef.current) return;
    levelTimerRef.current = setInterval(() => {
      const speaking = new Set();
      for (const [id, { analyser, data }] of analysersRef.current.entries()) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        if (sum / data.length > 12) speaking.add(id);
      }
      // Only re-render when the set of speakers actually changed
      const prev = speakersRef.current;
      if (speaking.size === prev.size && [...speaking].every(s => prev.has(s))) return;
      speakersRef.current = speaking;
      setSpeakers(new Set(speaking));
    }, 250);
  }

  // ── Join / leave ──────────────────────────────────────────────────────
  const joinVoice = useCallback(async () => {
    if (joinedRef.current || !roomId) return;
    setJoining(true);
    setError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Voice chat needs a browser with microphone support');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      localStreamRef.current = stream;
      joinedRef.current = true;
      setJoined(true);
      socket.emit('voice_join', { roomId }, (res) => {
        if (res && res.ok) {
          setMembers(res.members.map(m => ({ socketId: m.socketId, name: m.name, state: 'connecting' })));
          res.members.forEach(m => connectTo(m.socketId));
          startLevelMonitor();
        } else {
          setError((res && res.error) || 'Could not join voice');
        }
      });
    } catch (err) {
      setError(
        err && err.name === 'NotAllowedError'
          ? 'Microphone blocked — allow mic access in your browser'
          : (err && err.message) || 'Microphone unavailable'
      );
      setJoining(false);
    }
  }, [roomId, socket]);

  const leaveVoice = useCallback(() => {
    if (!joinedRef.current) return;
    for (const id of [...peersRef.current.keys()]) closePeer(id);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (levelTimerRef.current) { clearInterval(levelTimerRef.current); levelTimerRef.current = null; }
    socket.emit('voice_leave', { roomId });
    joinedRef.current = false;
    setJoined(false);
    setMuted(false);
    setMembers([]);
    setSpeakers(new Set());
    speakersRef.current = new Set();
  }, [roomId, socket]);

  const leaveVoiceRef = useRef(leaveVoice);
  useEffect(() => { leaveVoiceRef.current = leaveVoice; });
  useEffect(() => () => { leaveVoiceRef.current(); }, []);

  // ── Signaling listeners (registered once; guarded by joinedRef) ──────
  useEffect(() => {
    const onJoined = ({ socketId, name }) => {
      if (!joinedRef.current) return;
      // They'll send us an offer — show them as connecting until audio flows
      setMembers(prev => prev.some(m => m.socketId === socketId)
        ? prev
        : [...prev, { socketId, name: name || 'Player', state: 'connecting' }]);
    };
    const onOffer = async ({ from, sdp }) => {
      if (!joinedRef.current || !sdp) return;
      setMembers(prev => prev.some(m => m.socketId === from)
        ? prev
        : [...prev, { socketId: from, name: 'Player', state: 'connecting' }]);
      let pc = peersRef.current.get(from);
      if (!pc) pc = makePeer(from);
      try {
        await pc.setRemoteDescription(sdp);
        if (pc.signalingState === 'stable') return; // duplicate/glare offer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice_answer', { roomId, to: from, sdp: pc.localDescription });
      } catch (err) {
        console.error('voice answer failed', err);
      }
    };
    const onAnswer = async ({ from, sdp }) => {
      if (!joinedRef.current || !sdp) return;
      const pc = peersRef.current.get(from);
      if (pc && pc.signalingState !== 'stable') {
        try { await pc.setRemoteDescription(sdp); } catch (err) { console.error('voice remote desc failed', err); }
      }
    };
    const onIce = ({ from, candidate }) => {
      if (!joinedRef.current || !candidate) return;
      const pc = peersRef.current.get(from);
      if (pc) pc.addIceCandidate(candidate).catch(() => {});
    };
    const onLeft = ({ socketId }) => {
      if (!joinedRef.current) return;
      closePeer(socketId);
      setMembers(prev => prev.filter(m => m.socketId !== socketId));
    };
    // The socket dropped and reconnected (new socket id) — re-register in the
    // room's voice chat and rebuild any peers the server no longer knows about.
    const onSocketConnect = () => {
      if (!joinedRef.current) return;
      socket.emit('voice_join', { roomId }, (res) => {
        if (res && res.ok) res.members.forEach(m => connectTo(m.socketId));
      });
    };
    socket.on('voice_joined', onJoined);
    socket.on('voice_offer', onOffer);
    socket.on('voice_answer', onAnswer);
    socket.on('voice_ice', onIce);
    socket.on('voice_left', onLeft);
    socket.on('connect', onSocketConnect);
    return () => {
      socket.off('voice_joined', onJoined);
      socket.off('voice_offer', onOffer);
      socket.off('voice_answer', onAnswer);
      socket.off('voice_ice', onIce);
      socket.off('voice_left', onLeft);
      socket.off('connect', onSocketConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, socket]);

  // ── Render ────────────────────────────────────────────────────────────
  if (!roomId) return null;

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const next = !muted;
    setMuted(next);
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  return (
    <div className="voice-chat">
      {!joined ? (
        <>
          <button className="voice-btn" onClick={joinVoice} disabled={joining}>
            {joining ? 'Connecting…' : '🎤 Voice'}
          </button>
          {error && <div className="voice-error">{error}</div>}
        </>
      ) : (
        <div className="voice-panel">
          <div className="voice-panel-header">
            <span className="voice-title">🎙 Voice · {members.length + 1}</span>
            <button
              className={`voice-mute${muted ? ' muted' : ''}`}
              onClick={toggleMute}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button className="voice-leave" onClick={leaveVoice} title="Leave voice">✕</button>
          </div>
          <div className="voice-members">
            <div className="voice-member me">
              <span className="voice-dot" />{meName || 'You'}{muted ? ' (muted)' : ''}
            </div>
            {members.map(m => (
              <div key={m.socketId} className={`voice-member${m.state === 'reconnecting' ? ' reconnecting' : ''}${speakers.has(m.socketId) ? ' speaking' : ''}`}>
                <span className="voice-dot" />{m.name}
                {m.state === 'reconnecting' ? ' (reconnecting…)' : m.state !== 'connected' ? ' (connecting…)' : ''}
              </div>
            ))}
          </div>
          {error && <div className="voice-error">{error}</div>}
        </div>
      )}
    </div>
  );
}
