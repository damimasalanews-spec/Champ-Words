console.log('play-now-create-join.js loaded');

(function registerPlayNowHandler(){
  const socket = window.appSocket || window.__debugSocket || (window.io ? io() : null);
  if(!socket) { console.warn('PlayNow handler: socket not available'); return; }
  window.appSocket = socket;
  const playBtn = Array.from(document.querySelectorAll('button,a'))
    .find(el => el.textContent && el.textContent.trim().toLowerCase() === 'play now');
  if(!playBtn){ console.warn('PlayNow handler: Play Now button not found'); return; }

  function setBusy(on){
    playBtn.disabled = !!on;
    playBtn.dataset.busy = !!on;
    playBtn.textContent = on ? 'Joining...' : 'Play Now';
  }

  playBtn.addEventListener('click', function onPlayClick(){
    setBusy(true);
    if(!socket.connected){
      try{ socket.connect(); }catch(err){ console.warn('socket.connect() failed', err); }
    }
    const playerName = window.playerName || localStorage.getItem('playerName') || 'Player';
    try{ localStorage.setItem('playerName', playerName); }catch(_){}
    socket.emit('create_room', { name: playerName }, function(createRes){
      console.log('create_room callback:', createRes);
      if(!createRes || !createRes.ok){ console.error('Create room failed:', createRes); setBusy(false); return; }
      const roomId = createRes.roomId;
      socket.emit('join_room', { roomId: roomId, name: playerName }, function(joinRes){
        console.log('join_room callback:', joinRes);
        if(!joinRes || !joinRes.ok){ console.error('Join room failed:', joinRes); setBusy(false); return; }
        window.location.href = '/room/' + encodeURIComponent(roomId);
      });
    });
    playBtn.removeEventListener('click', onPlayClick);
  });
})();