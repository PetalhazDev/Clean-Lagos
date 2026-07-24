(function(){
  // ---------------- Data ----------------
  var LGAS = [
    "Agege","Ajeromi-Ifelodun","Alimosho","Amuwo-Odofin","Apapa","Badagry",
    "Epe","Eti-Osa","Ibeju-Lekki","Ifako-Ijaiye","Ikeja","Ikorodu",
    "Kosofe","Lagos Island","Lagos Mainland","Mushin","Ojo","Oshodi-Isolo",
    "Shomolu","Surulere"
  ];
  var SCHED_DAYS = ["Mon, Thu","Tue, Fri","Wed, Sat","Mon, Wed, Fri","Tue, Sat"];
  var TYPE_META = {
    overflow:{label:"Overflowing bin", icon:"🗑️", color:"var(--amber)"},
    dumping:{label:"Illegal dumping", icon:"🚫", color:"var(--red)"},
    missed:{label:"Missed collection", icon:"📅", color:"var(--terracotta)"}
  };
  var STATUS_META = {
    pending:{label:"Pending", cls:"status-pending"},
    progress:{label:"In progress", cls:"status-progress"},
    resolved:{label:"Resolved", cls:"status-resolved"}
  };

  var state = {
    complaints: [],
    notifications: [],
    selectedType: "overflow",
    coords: null,
    photoData: null,
    heatFilter: null,
    nextId: 1
  };

  function pad(n){ return n < 10 ? "0"+n : ""+n; }
  function fmtTime(d){
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
  }
  function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function pick(arr){ return arr[rand(0,arr.length-1)]; }

  function seed(){
    var types = Object.keys(TYPE_META);
    var statuses = ["pending","progress","resolved"];
    var now = Date.now();
    for(var i=0;i<46;i++){
      var d = new Date(now - rand(0, 28)*86400000 - rand(0,23)*3600000);
      var st = statuses[Math.random() < 0.45 ? 2 : (Math.random() < 0.5 ? 0 : 1)];
      state.complaints.push({
        id: "CL-"+pad(state.nextId++),
        type: pick(types),
        lga: pick(LGAS),
        status: st,
        filed: d,
        coords: (6.45+Math.random()*0.25).toFixed(4)+"° N, "+(3.30+Math.random()*0.35).toFixed(4)+"° E",
        desc: "",
        photo: null
      });
    }
  }
  seed();

  // ---------------- View switching ----------------
  var btnResident = document.getElementById('btn-resident');
  var btnAgency = document.getElementById('btn-agency');
  var viewResident = document.getElementById('view-resident');
  var viewAgency = document.getElementById('view-agency');
  btnResident.addEventListener('click', function(){
    btnResident.classList.add('active'); btnAgency.classList.remove('active');
    viewResident.classList.add('active'); viewAgency.classList.remove('active');
  });
  btnAgency.addEventListener('click', function(){
    btnAgency.classList.add('active'); btnResident.classList.remove('active');
    viewAgency.classList.add('active'); viewResident.classList.remove('active');
    renderAgency();
  });

  // ---------------- Notifications ----------------
  var bellBtn = document.getElementById('bell-btn');
  var bellDot = document.getElementById('bell-dot');
  var notifPanel = document.getElementById('notif-panel');
  var unread = 0;

  function pushNotification(text){
    state.notifications.unshift({ text:text, time:new Date() });
    unread++;
    renderNotifications();
  }
  function renderNotifications(){
    bellDot.style.display = unread > 0 ? 'flex' : 'none';
    bellDot.textContent = unread;
    if(state.notifications.length === 0){
      notifPanel.innerHTML = '<div class="notif-item">No notifications yet. Resolved reports will appear here.</div>';
      return;
    }
    notifPanel.innerHTML = state.notifications.map(function(n){
      return '<div class="notif-item">'+n.text+'<span class="t">'+fmtTime(n.time)+'</span></div>';
    }).join('');
  }
  bellBtn.addEventListener('click', function(){
    notifPanel.classList.toggle('open');
    if(notifPanel.classList.contains('open')){ unread = 0; renderNotifications(); }
  });
  document.addEventListener('click', function(e){
    if(!notifPanel.contains(e.target) && e.target !== bellBtn){ notifPanel.classList.remove('open'); }
  });
  renderNotifications();

  // ---------------- Report form ----------------
  var lgaSelect = document.getElementById('report-lga');
  LGAS.forEach(function(l){
    var o = document.createElement('option'); o.value = l; o.textContent = l;
    lgaSelect.appendChild(o);
  });

  var typeGrid = document.getElementById('type-grid');
  typeGrid.addEventListener('click', function(e){
    var btn = e.target.closest('.type-opt');
    if(!btn) return;
    typeGrid.querySelectorAll('.type-opt').forEach(function(b){ b.classList.remove('selected'); });
    btn.classList.add('selected');
    state.selectedType = btn.getAttribute('data-type');
  });

  var coordsInput = document.getElementById('report-coords');
  document.getElementById('gps-btn').addEventListener('click', function(){
    if(!navigator.geolocation){
      coordsInput.value = "Location unavailable on this device";
      return;
    }
    coordsInput.value = "Locating…";
    navigator.geolocation.getCurrentPosition(function(pos){
      var lat = pos.coords.latitude.toFixed(4);
      var lng = pos.coords.longitude.toFixed(4);
      state.coords = lat+"° N, "+lng+"° E";
      coordsInput.value = state.coords;
    }, function(){
      var lat = (6.45+Math.random()*0.25).toFixed(4);
      var lng = (3.30+Math.random()*0.35).toFixed(4);
      state.coords = lat+"° N, "+lng+"° E";
      coordsInput.value = state.coords + " (approximate)";
    }, { timeout: 6000 });
  });

  var photoInput = document.getElementById('photo-input');
  var photoDrop = document.getElementById('photo-drop');
  var photoText = document.getElementById('photo-drop-text');
  photoInput.addEventListener('change', function(){
    var f = photoInput.files[0];
    if(!f) return;
    var reader = new FileReader();
    reader.onload = function(e){
      state.photoData = e.target.result;
      photoText.style.display = 'none';
      var existing = photoDrop.querySelector('img');
      if(existing) existing.remove();
      var img = document.createElement('img');
      img.src = e.target.result;
      photoDrop.appendChild(img);
    };
    reader.readAsDataURL(f);
  });

  var formMsg = document.getElementById('form-msg');
  document.getElementById('submit-report').addEventListener('click', function(){
    var lga = lgaSelect.value;
    var desc = document.getElementById('report-desc').value.trim();
    var c = {
      id: "CL-"+pad(state.nextId++),
      type: state.selectedType,
      lga: lga,
      status: "pending",
      filed: new Date(),
      coords: state.coords || "Not provided",
      desc: desc,
      photo: state.photoData
    };
    state.complaints.unshift(c);
    formMsg.classList.add('show');
    setTimeout(function(){ formMsg.classList.remove('show'); }, 4000);
    document.getElementById('report-desc').value = '';
    coordsInput.value = '';
    state.coords = null;
    state.photoData = null;
    photoText.style.display = 'block';
    var img = photoDrop.querySelector('img'); if(img) img.remove();
    photoInput.value = '';
    renderResident();
  });

  // ---------------- Bin gauge (signature element) ----------------
  function drawGauge(svgEl, pct, color){
    var r = 34, cx = 43, cy = 43, stroke = 9;
    var circumference = 2*Math.PI*r;
    var offset = circumference * (1 - pct/100);
    svgEl.innerHTML =
      '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(244,239,230,0.12)" stroke-width="'+stroke+'"></circle>'+
      '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+stroke+'" '+
        'stroke-linecap="round" stroke-dasharray="'+circumference+'" stroke-dashoffset="'+offset+'" '+
        'transform="rotate(-90 '+cx+' '+cy+')" style="transition:stroke-dashoffset .6s ease;"></circle>'+
      '<text x="'+cx+'" y="'+(cy+5)+'" text-anchor="middle" font-family="JetBrains Mono" font-size="14" fill="#F4EFE6">'+Math.round(pct)+'%</text>';
  }

  // ---------------- Resident render ----------------
  function resolutionRate(list){
    if(list.length === 0) return 0;
    var resolved = list.filter(function(c){ return c.status === 'resolved'; }).length;
    return (resolved/list.length)*100;
  }

  function renderResident(){
    var all = state.complaints;
    var open = all.filter(function(c){ return c.status !== 'resolved'; }).length;
    var resolvedThisMonth = all.filter(function(c){ return c.status === 'resolved'; }).length;
    document.getElementById('hero-open').textContent = open;
    document.getElementById('hero-resolved').textContent = resolvedThisMonth;

    // user-submitted reports = ones added with desc field tracked (we just show most recent 8 overall as "your" reports for demo)
    var mine = all.slice(0, 8);
    document.getElementById('tracker-count').textContent = mine.length + ' reports';
    document.getElementById('tracker-list').innerHTML = mine.map(function(c){
      var tm = TYPE_META[c.type], sm = STATUS_META[c.status];
      return '<div class="tracker-item">'+
        '<div class="tracker-icon" style="background:rgba(244,239,230,0.08);">'+tm.icon+'</div>'+
        '<div class="tracker-body">'+
          '<div class="tracker-title">'+tm.label+' · '+c.lga+'</div>'+
          '<div class="tracker-meta">'+c.id+' · filed '+fmtTime(c.filed)+'</div>'+
        '</div>'+
        '<span class="status-pill '+sm.cls+'">'+sm.label+'</span>'+
      '</div>';
    }).join('');

    // schedule
    document.getElementById('schedule-body').innerHTML = LGAS.map(function(l, i){
      return '<tr><td>'+l+'</td><td><span class="day-chip">'+SCHED_DAYS[i % SCHED_DAYS.length]+'</span></td><td class="id-mono">Zone '+String.fromCharCode(65 + (i % 6))+'</td></tr>';
    }).join('');

    // rankings
    var byLga = {};
    LGAS.forEach(function(l){ byLga[l] = []; });
    all.forEach(function(c){ byLga[c.lga].push(c); });
    var ranked = LGAS.map(function(l){
      return { lga: l, rate: resolutionRate(byLga[l]), count: byLga[l].length };
    }).filter(function(r){ return r.count > 0; })
      .sort(function(a,b){ return b.rate - a.rate; });

    document.getElementById('rank-list').innerHTML = ranked.map(function(r, i){
      var color = r.rate >= 66 ? 'var(--teal)' : (r.rate >= 33 ? 'var(--amber)' : 'var(--red)');
      return '<div class="rank-item">'+
        '<span class="rank-pos">#'+(i+1)+'</span>'+
        '<span class="rank-name">'+r.lga+'</span>'+
        '<div class="rank-bar-wrap"><div class="rank-bar" style="width:'+r.rate+'%; background:'+color+';"></div></div>'+
        '<span class="rank-score">'+Math.round(r.rate)+'%</span>'+
      '</div>';
    }).join('');

    var overallRate = resolutionRate(all);
    drawGauge(document.getElementById('gauge-svg'), overallRate, 'var(--teal)'.includes('var') ? '#1F6F5C' : '#1F6F5C');
    document.getElementById('gauge-pct').textContent = Math.round(overallRate)+'%';
  }

  // ---------------- Agency render ----------------
  var heatGrid = document.getElementById('heat-grid');
  var filterLabel = document.getElementById('filter-label');
  var clearFilterBtn = document.getElementById('clear-filter');

  function renderAgency(){
    var all = state.complaints;
    var total = all.length;
    var resolved = all.filter(function(c){ return c.status === 'resolved'; }).length;
    var dumping = all.filter(function(c){ return c.type === 'dumping' && c.status !== 'resolved'; }).length;
    var avgDays = 2 + (Math.sin(total) * 0.4); // stable mock figure

    document.getElementById('stat-cards').innerHTML =
      '<div class="stat-card"><div class="num">'+total+'</div><div class="lbl">Total reports filed</div></div>'+
      '<div class="stat-card alt"><div class="num">'+resolved+'</div><div class="lbl">Resolved</div></div>'+
      '<div class="stat-card warn"><div class="num">'+dumping+'</div><div class="lbl">Active illegal dumping</div></div>'+
      '<div class="stat-card amber"><div class="num">'+avgDays.toFixed(1)+'d</div><div class="lbl">Avg. resolution time</div></div>';

    // heat map by LGA
    var counts = {};
    LGAS.forEach(function(l){ counts[l] = 0; });
    all.forEach(function(c){ if(c.status !== 'resolved') counts[c.lga]++; });
    var max = Math.max.apply(null, LGAS.map(function(l){ return counts[l]; })) || 1;

    heatGrid.innerHTML = LGAS.map(function(l){
      var n = counts[l];
      var intensity = n / max;
      var color = intensity > 0.66 ? '#C73E3E' : (intensity > 0.33 ? '#E8B23D' : '#2A3038');
      var isActive = state.heatFilter === l ? 'active-filter' : '';
      return '<div class="heat-tile '+isActive+'" style="background:'+color+';" data-lga="'+l+'">'+
        '<span class="lga-name">'+l+'</span>'+
        '<span class="lga-count">'+n+'</span>'+
      '</div>';
    }).join('');

    heatGrid.querySelectorAll('.heat-tile').forEach(function(tile){
      tile.addEventListener('click', function(){
        var l = tile.getAttribute('data-lga');
        state.heatFilter = (state.heatFilter === l) ? null : l;
        renderAgency();
      });
    });

    filterLabel.textContent = state.heatFilter || 'All LGAs';
    clearFilterBtn.style.display = state.heatFilter ? 'inline-block' : 'none';

    var overallRate = resolutionRate(all);
    drawGauge(document.getElementById('gauge-svg-2'), overallRate, '#1F6F5C');
    document.getElementById('gauge-pct-2').textContent = Math.round(overallRate)+'%';

    // queue
    var list = state.heatFilter ? all.filter(function(c){ return c.lga === state.heatFilter; }) : all;
    document.getElementById('queue-count').textContent = list.length + ' in queue';
    document.getElementById('queue-body').innerHTML = list.slice(0, 30).map(function(c){
      var tm = TYPE_META[c.type], sm = STATUS_META[c.status];
      var nextAction = c.status === 'pending' ? 'progress' : (c.status === 'progress' ? 'resolved' : null);
      var btnLabel = c.status === 'pending' ? 'Start' : (c.status === 'progress' ? 'Mark resolved' : 'Closed');
      return '<tr>'+
        '<td class="id-mono">'+c.id+'</td>'+
        '<td>'+tm.icon+' '+tm.label+'</td>'+
        '<td>'+c.lga+'</td>'+
        '<td class="id-mono">'+fmtTime(c.filed)+'</td>'+
        '<td><span class="status-pill '+sm.cls+'">'+sm.label+'</span></td>'+
        '<td><button class="mini-btn '+(c.type==='dumping'?'alt':'')+'" data-id="'+c.id+'" '+(nextAction?'':'disabled')+'>'+btnLabel+'</button></td>'+
      '</tr>';
    }).join('');

    document.querySelectorAll('.mini-btn[data-id]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-id');
        var c = state.complaints.find(function(x){ return x.id === id; });
        if(!c) return;
        if(c.status === 'pending'){
          c.status = 'progress';
        } else if(c.status === 'progress'){
          c.status = 'resolved';
          var tm = TYPE_META[c.type];
          pushNotification('Your report <strong>'+c.id+'</strong> ('+tm.label+', '+c.lga+') has been resolved.');
        }
        renderAgency();
        renderResident();
      });
    });
  }

  document.getElementById('clear-filter').addEventListener('click', function(){
    state.heatFilter = null;
    renderAgency();
  });

  renderResident();
  renderAgency();
})();