(() => {
  /* UI 뒤편을 반짝이는 별과 드문 유성 애니메이션으로 연출 */
  const canvas = document.getElementById('bg-stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let width = 0, height = 0, dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let stars = [];
  let shooters = [];
  let rafId = 0;
  let lastTime = 0;
  let nextShooter = 0;
  let densityMultiplier = 1;
  let shooterIntervalScale = 1;

  const STAR_COUNT_BASE = 220; // base density (slightly denser)
  const SHOOT_INTERVAL_MIN = 4;
  const SHOOT_INTERVAL_MAX = 6;

  // 뷰포트 변화에 맞춰 DPI를 보정하고 입자를 다시 생성
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = dpr;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    initStars();
    shooters = [];
    nextShooter = 0;
    lastTime = 0;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  // 화면 크기에 비례해 반짝임과 이동 속성이 다른 별 입자를 채움
  function initStars() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    const area = width * height;
    const density = STAR_COUNT_BASE * densityMultiplier * (area / (1280 * 720));
    const count = Math.min(500, Math.max(120, Math.floor(density)));
    stars = new Array(count).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: rand(0.5, 1.6),
      baseA: rand(0.5, 1.0),
      twk: rand(0.5, 1.6), // twinkle speed
      phase: Math.random() * Math.PI * 2,
      driftX: rand(-0.02, 0.02),
      driftY: rand(-0.02, 0.02),
      hue: rand(200, 250), // cool bluish stars
      flashUntil: now,
      flashDuration: 0,
      flashAmp: 0,
      nextFlash: now + rand(1.5, 6)
    }));
  }

  // 임의의 궤적과 수명을 가진 유성을 만들어 간헐적인 하이라이트를 연출
  function spawnShooter(now) {
    const angle = rand(Math.PI * 0.15, Math.PI * 0.35);
    const speedBase = Math.max(width, height) * rand(0.45, 0.65);
    const startX = rand(-0.25 * width, 0.15 * width);
    const startY = rand(-0.2 * height, 0.35 * height);
    shooters.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speedBase,
      vy: Math.sin(angle) * speedBase,
      life: 0,
      maxLife: rand(1.1, 1.8),
      hue: rand(195, 220),
      trail: []
    });
  }

  // 프레임마다 별 배경 요소를 갱신·렌더링하고 다음 호출을 예약
  function step(t) {
    const now = t * 0.001;
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.05, now - lastTime);
    lastTime = now;

    if (now >= nextShooter) {
      spawnShooter(now);
      const intervalMin = SHOOT_INTERVAL_MIN * shooterIntervalScale;
      const intervalMax = SHOOT_INTERVAL_MAX * shooterIntervalScale;
      nextShooter = now + rand(intervalMin, intervalMax);
    }

    ctx.clearRect(0, 0, width, height);

    // Subtle vignette
    const g = ctx.createRadialGradient(width/2, height/2, Math.min(width, height)*0.1, width/2, height/2, Math.max(width, height)*0.75);
    g.addColorStop(0, 'rgba(11,16,32,0.0)');
    g.addColorStop(1, 'rgba(11,16,32,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    for (const s of stars) {
      s.phase += 0.03 * s.twk;

      if (now >= s.nextFlash) {
        s.flashDuration = rand(0.25, 0.65);
        s.flashUntil = now + s.flashDuration;
        s.flashAmp = rand(0.6, 1.1);
        s.nextFlash = now + s.flashDuration + rand(2.5, 6.5);
      }

      let flashBoost = 0;
      if (s.flashUntil > now) {
        const progress = 1 - (s.flashUntil - now) / s.flashDuration;
        flashBoost = Math.pow(Math.sin(progress * Math.PI), 2) * s.flashAmp;
      }

      const twinkle = 0.45 + 0.55 * ((Math.sin(s.phase) + 1) * 0.5);
      const a = Math.min(1, s.baseA * twinkle + flashBoost);
      const radius = s.r * (1 + flashBoost * 0.9);

      s.x += s.driftX; s.y += s.driftY;
      if (s.x < -2) s.x = width + 2; if (s.x > width + 2) s.x = -2;
      if (s.y < -2) s.y = height + 2; if (s.y > height + 2) s.y = -2;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${s.hue}, 82%, 88%, ${a})`;
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // small glow
      ctx.beginPath();
      ctx.fillStyle = `hsla(${s.hue}, 90%, 75%, ${Math.min(0.8, a * 0.35)})`;
      ctx.arc(s.x, s.y, radius * 2.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw shooting stars with luminous trails
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const fade = Math.max(0, 1 - s.life / s.maxLife);
      s.trail.unshift({ x: s.x, y: s.y, fade });
      if (s.trail.length > 22) s.trail.pop();

      const tail = s.trail[Math.min(14, s.trail.length - 1)];
      if (tail) {
        const grad = ctx.createLinearGradient(s.x, s.y, tail.x, tail.y);
        grad.addColorStop(0, `hsla(${s.hue}, 95%, 92%, ${0.85 * fade})`);
        grad.addColorStop(0.6, `hsla(${s.hue}, 90%, 70%, ${0.4 * fade})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        for (let j = 1; j < s.trail.length; j++) {
          const p = s.trail[j];
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = `hsla(${s.hue}, 100%, 95%, ${0.9 * fade + 0.1})`;
      ctx.arc(s.x, s.y, 2.6 + 1.4 * fade, 0, Math.PI * 2);
      ctx.fill();

      if (s.life > s.maxLife || s.x > width + 250 || s.y > height + 250) {
        shooters.splice(i, 1);
      }
    }

    rafId = requestAnimationFrame(step);
  }

  // 애니메이션 루프를 시작하며 재시작 시 타이밍 상태를 초기화
  function start() {
    cancelAnimationFrame(rafId);
    lastTime = 0;
    rafId = requestAnimationFrame(step);
  }

  // 탭이 숨겨지면 자원을 아끼기 위해 애니메이션 루프를 중단
  function stop() {
    cancelAnimationFrame(rafId);
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  document.addEventListener('starboost', (event) => {
    const boosted = !!(event && event.detail);
    densityMultiplier = boosted ? 1.5 : 1;
    shooterIntervalScale = boosted ? 0.65 : 1;
    initStars();
    shooters = [];
    nextShooter = 0;
  });

  resize();
  start();
})();
