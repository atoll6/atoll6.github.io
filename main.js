/*
  3D Solar background for the homepage
  - No external state leaked
  - Honors prefers-reduced-motion
  - Renders once when motion is reduced
*/

(() => {
  const canvas = document.getElementById('solar3d');
  const fallbackEl = document.getElementById('webgl-fallback');
  if (!canvas) return;

  const showFallback = (message) => {
    if (!fallbackEl) return;
    if (message) fallbackEl.textContent = message;
    fallbackEl.hidden = false;
  };

  const isWebGLAvailable = () => {
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  };

  if (!isWebGLAvailable()) {
    canvas.style.display = 'none';
    showFallback("3D background isn't available on this device.");
    return;
  }

  // Core three.js objects
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Initial sizing
  const applySize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  // Setup renderer and camera
  renderer.setClearColor(0x000000, 0);
  applySize();
  camera.position.set(0, 25, 60);
  camera.lookAt(0, 0, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  // Helpers
  const createRadialTexture = (color1, color2, size = 256) => {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = size;
    const ctx = texCanvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, size / 8, size / 2, size / 2, size / 2);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(texCanvas);
    if ('colorSpace' in texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if ('encoding' in texture) {
      // Older three.js fallback
      texture.encoding = THREE.sRGBEncoding;
    }
    texture.anisotropy = 4;
    return texture;
  };

  // Sun
  const addSun = () => {
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunTexture = createRadialTexture('#fff200', '#ff9800', 512);
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Glow
    const sunGlow = new THREE.PointLight(0xfff200, 2, 100);
    scene.add(sunGlow);
    return sun;
  };

  // Planets
  const planetData = [
    ['Mercury', '#b2b2b2', '#6e6e6e', 9, 0.7, 0.018, false],
    ['Venus',   '#e0c16c', '#bfa24d', 12, 1.1, 0.014, false],
    ['Earth',   '#3a6ea5', '#1b3c5d', 16, 1.2, 0.012, false],
    ['Mars',    '#b5532a', '#7a2e13', 20, 1.0, 0.010, false],
    ['Jupiter', '#e0a96d', '#b57c3a', 26, 2.5, 0.008, false],
    ['Saturn',  '#d2c295', '#b3a178', 33, 2.2, 0.007, true],
    ['Uranus',  '#7ad7f0', '#3a8ca5', 39, 1.7, 0.006, true],
    ['Neptune', '#4062a7', '#22345d', 45, 1.7, 0.005, false]
  ];

  const addPlanets = () => {
    const planets = [];
    for (const [name, color1, color2, orbitRadius, size, speed, hasRing] of planetData) {
      const geometry = new THREE.SphereGeometry(size, 24, 24);
      const texture = createRadialTexture(color1, color2);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      if (hasRing) {
        const ringGeometry = new THREE.RingGeometry(size * 1.4, size * 2.2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: name === 'Saturn' ? 0xd2c295 : 0x8fc5e7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
      }

      planets.push({ mesh, orbitRadius, speed, phase: Math.random() * Math.PI * 2 });
    }
    return planets;
  };

  const addOrbitLines = () => {
    for (const [, , , orbitRadius] of planetData) {
      const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.01, orbitRadius + 0.01, 64);
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.08,
      });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    }
  };

  // Build scene
  const sun = addSun();
  const planets = addPlanets();
  addOrbitLines();

  // Motion handling
  const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionMedia.matches;
  let rafId = 0;

  const updatePositions = (timeMs) => {
    planets.forEach((p) => {
      const t = timeMs * p.speed * 0.5e-3 + p.phase;
      p.mesh.position.x = Math.cos(t) * p.orbitRadius;
      p.mesh.position.z = Math.sin(t) * p.orbitRadius;
    });
    sun.rotation.y += 0.002;
  };

  const renderFrame = () => {
    renderer.render(scene, camera);
  };

  const animate = () => {
    if (reduceMotion) return;
    rafId = requestAnimationFrame(animate);
    updatePositions(performance.now());
    renderFrame();
  };

  const startAnimation = () => {
    if (!rafId && !reduceMotion) rafId = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    renderFrame();
  };

  if (reduceMotion) {
    updatePositions(0);
    renderFrame();
  } else {
    startAnimation();
  }

  motionMedia.addEventListener('change', (e) => {
    reduceMotion = e.matches;
    if (reduceMotion) stopAnimation();
    else startAnimation();
  });

  // Resize handling
  window.addEventListener('resize', () => {
    applySize();
    if (reduceMotion) renderFrame();
  });
})();
