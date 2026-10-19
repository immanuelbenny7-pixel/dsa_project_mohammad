/**
 * game.js - Pump Shift: Fuel Station Simulator
 * Main Game Loop, 3D Scene Controller, Shift Management & UI Integrations
 */

class Game {
  constructor() {
    this.state = 'TITLE'; // TITLE, PLAYING, PAUSED, SHIFT_END
    this.shiftDuration = 180; // 3 minutes shift
    this.timeRemaining = this.shiftDuration;
    this.targetCustomers = 10;
    this.cash = 0.00;
    this.customersServed = 0;
    this.mistakesCount = 0;
    this.undoneCount = 0;
    this.satisfaction = 100; // Percentage 0 - 100

    // Data Structures
    this.queue = new CustomerQueue();
    this.transactionStack = new TransactionStack();
    this.fuelMap = new FuelHashMap();
    this.carOrderMap = new CarOrderMap();
    this.salesList = new DailySalesList();
    this.receiptList = new ReceiptLinkedList();

    // Finish Point & Settlement State (10 Cars Completed)
    this.isFinishPointActive = false;
    this.isCalculationDone = false;
    this.calcRunningTotal = 0.00;
    this.calcRunningLitres = 0.0;
    this.calcStepIndex = 0;
    this.calcAnimTimer = null;

    // Car and Dispenser State
    this.nextCarNum = 101;
    this.nextTxNum = 5001;
    this.activeCar = null;
    this.activeOrder = null;
    this.selectedFuel = 'regular';
    this.isNozzleConnected = false;
    this.isPumping = false;
    this.deliveredLitres = 0.0;
    this.lastUndoSale = null;
    this.isFuelCapAimed = false;    // True when crosshair is on the fuel cap ring
    this.fuelCapRingTimer = 0;      // For pulsing animation

    // First Person Camera & Controls State
    this.cameraMode = 'FIRST_PERSON'; // 'FIRST_PERSON' (default) or 'THIRD_PERSON'
    this.fpYaw = Math.PI / 2; // Face towards the cars and pump island
    this.fpPitch = -0.05;
    this.isPointerLocked = false;
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.walkBobTimer = 0;
    this.raycaster = new THREE.Raycaster();
    this.screenCenter = new THREE.Vector2(0, 0);
    this.currentContextAction = null;
    this.isHoldingNozzle = true; // Attendant is holding dispenser nozzle

    // Movement & Inputs
    this.keys = {};
    this.moveDir = new THREE.Vector3();

    // Spawn timer
    this.spawnTimer = 0;
    this.spawnInterval = 14.0; // Seconds between car arrivals

    // 3D Scene setup
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.station = null;
    this.attendant = null;
    this.fpViewmodel = null;
    this.clock = new THREE.Clock();
    this.activeWorldCars = []; // Active 3D car instances

    // Queue 3D Slot Coordinates (Lane X = -3.2, moving from Z = 28 -> Z = 0 -> Z = -28)
    this.queueLaneX = -3.2;
    this.queueSlotsZ = [0.0, 7.5, 14.5, 21.5]; // Slot 0 is pump position

    this.initThree();
    this.initEvents();
    this.bindDSACallbacks();
    this.updateHUD();
    this.animate();
  }

  // ==========================================
  // THREE.JS SETUP & LIGHTING
  // ==========================================
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep modern night/dusk blue
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // Camera: First-person eye level perspective (65 deg FOV)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 150);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.6);
    this.scene.add(ambientLight);

    // Directional Sun/Moonlight
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.scene.add(dirLight);

    // Under-canopy Warm Spotlights
    const canopyLight1 = new THREE.PointLight(0xfef08a, 1.2, 14);
    canopyLight1.position.set(-2, 4.8, -1);
    this.scene.add(canopyLight1);

    const canopyLight2 = new THREE.PointLight(0xfef08a, 1.2, 14);
    canopyLight2.position.set(-2, 4.8, 3);
    this.scene.add(canopyLight2);

    // Build Station World
    const builder = new StationBuilder(this.scene);
    this.station = builder.buildStation();

    // Attendant Worker
    this.attendant = new AttendantCharacter(this.scene);
    this.attendant.group.position.set(0.5, 0, 0.5);

    // First-Person Viewmodel (Hands & held nozzle)
    this.fpViewmodel = AttendantCharacter.createFPViewmodel();
    this.camera.add(this.fpViewmodel.group);
    this.attendant.setFirstPerson(true);

    // Dynamic 3D Hose connecting pump dispenser to car fuel port
    this.initDynamicHose();

    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initDynamicHose() {
    const hosePoints = [
      new THREE.Vector3(-0.6, 1.0, 0),
      new THREE.Vector3(-1.2, 0.4, 0.3),
      new THREE.Vector3(-2.2, 0.8, 0.6)
    ];
    this.hoseCurve = new THREE.CatmullRomCurve3(hosePoints);
    this.hoseGeo = new THREE.TubeGeometry(this.hoseCurve, 16, 0.04, 6, false);
    this.hoseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.hoseMesh = new THREE.Mesh(this.hoseGeo, this.hoseMat);
    this.hoseMesh.visible = false;
    this.scene.add(this.hoseMesh);
  }

  updateDynamicHose() {
    if (!this.hoseMesh.visible) return;

    let pStart = new THREE.Vector3(-0.65, 1.1, 0.0); // Pump dispenser side
    let pEnd;

    if (this.isNozzleConnected && this.activeCar) {
      // Connect to car fuel port
      pEnd = new THREE.Vector3(-3.2 + this.activeCar.fuelPortOffset.x, this.activeCar.fuelPortOffset.y, this.activeCar.mesh.position.z + this.activeCar.fuelPortOffset.z);
    } else if (this.cameraMode === 'FIRST_PERSON') {
      // In first person viewmodel hand
      const fwd = new THREE.Vector3(0.22, -0.35, -0.42).applyEuler(this.camera.rotation);
      pEnd = this.camera.position.clone().add(fwd);
    } else if (this.attendant.heldNozzle.visible) {
      // In attendant's hand
      pEnd = new THREE.Vector3(
        this.attendant.group.position.x + 0.4,
        this.attendant.group.position.y + 0.8,
        this.attendant.group.position.z - 0.2
      );
    } else {
      this.hoseMesh.visible = false;
      return;
    }

    // Midpoint droop
    const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
    mid.y = Math.max(0.15, Math.min(pStart.y, pEnd.y) - 0.5);

    this.hoseCurve.points[0].copy(pStart);
    this.hoseCurve.points[1].copy(mid);
    this.hoseCurve.points[2].copy(pEnd);

    this.hoseMesh.geometry.dispose();
    this.hoseMesh.geometry = new THREE.TubeGeometry(this.hoseCurve, 16, 0.04, 6, false);
  }

  // ==========================================
  // INPUTS AND EVENT BINDINGS
  // ==========================================
  initEvents() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;

      if (e.key === 'Escape') {
        this.togglePause();
      }

      if (this.state !== 'PLAYING') return;

      // Fuel Selection shortcuts: 1, 2, 3
      if (e.key === '1') this.selectFuelType('regular');
      if (e.key === '2') this.selectFuelType('premium');
      if (e.key === '3') this.selectFuelType('diesel');

      // Interact / Connect / Finish: E
      if (e.key.toLowerCase() === 'e') {
        this.handleContextInteract();
      }

      // Camera Toggle shortcut: V
      if (e.key.toLowerCase() === 'v') {
        this.toggleCameraMode();
      }

      // Undo shortcut: U
      if (e.key.toLowerCase() === 'u') {
        this.undoLastSale();
      }

      // Spacebar hold to pump
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.startPumping();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.code === 'Space') {
        this.stopPumping();
      }
    });

    // Pointer Lock on Canvas Click (First-Person Look)
    this.renderer.domElement.addEventListener('click', () => {
      if (this.state === 'PLAYING' && this.cameraMode === 'FIRST_PERSON') {
        this.renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.renderer.domElement);
      const hint = document.getElementById('fp-hint');
      if (hint) {
        if (this.isPointerLocked) {
          hint.textContent = '🖱️ Mouse Look Active • [Esc] Unlock cursor • [V] Toggle camera';
          hint.style.opacity = '0.45';
        } else {
          hint.textContent = '🖱️ Click screen to lock mouse look • [Esc] Unlock cursor • [V] Toggle camera';
          hint.style.opacity = '0.85';
        }
      }
    });

    // Mouse Look (both locked pointer and click-drag fallback)
    window.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING' || this.cameraMode !== 'FIRST_PERSON') return;
      if (this.isPointerLocked) {
        this.fpYaw -= e.movementX * 0.0024;
        this.fpPitch -= e.movementY * 0.0024;
        this.fpPitch = Math.max(-1.38, Math.min(1.38, this.fpPitch));
      } else if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.fpYaw -= dx * 0.003;
        this.fpPitch -= dy * 0.003;
        this.fpPitch = Math.max(-1.38, Math.min(1.38, this.fpPitch));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // In first-person pointer locked mode, left click can trigger context interact or start pumping
      if (e.button === 0 && this.state === 'PLAYING' && this.cameraMode === 'FIRST_PERSON') {
        if (this.isNozzleConnected) {
          this.startPumping();
        } else if (this.currentContextAction) {
          this.handleContextInteract();
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.isMouseDown = false;
      if (e.button === 0 && this.isPumping) {
        this.stopPumping();
      }
    });

    // Mouse Pumping button hold events
    const pumpBtn = document.getElementById('btn-pump-fuel');
    if (pumpBtn) {
      const handleDown = (e) => {
        e.preventDefault();
        if (this.state === 'PLAYING') this.startPumping();
      };
      const handleUp = (e) => {
        e.preventDefault();
        this.stopPumping();
      };
      pumpBtn.addEventListener('mousedown', handleDown);
      pumpBtn.addEventListener('mouseup', handleUp);
      pumpBtn.addEventListener('mouseleave', handleUp);
      pumpBtn.addEventListener('touchstart', handleDown, { passive: false });
      pumpBtn.addEventListener('touchend', handleUp, { passive: false });
    }

    // Connect Nozzle Button
    const connectBtn = document.getElementById('btn-connect-nozzle');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        window.soundEngine.playClick();
        this.toggleNozzleConnection();
      });
    }

    // Complete Sale Button
    const completeBtn = document.getElementById('btn-complete-sale');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        window.soundEngine.playClick();
        this.completeSale();
      });
    }

    // Undo Sale Button
    const undoBtn = document.getElementById('btn-undo-sale');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        window.soundEngine.playClick();
        this.undoLastSale();
      });
    }

    // Fuel selector radio buttons in HUD
    ['regular', 'premium', 'diesel'].forEach(ft => {
      const el = document.getElementById(`fuel-btn-${ft}`);
      if (el) {
        el.addEventListener('click', () => {
          window.soundEngine.playClick();
          this.selectFuelType(ft);
        });
      }
    });

    // Camera Mode Toggle
    document.getElementById('btn-toggle-camera')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.toggleCameraMode();
    });

    // Header buttons
    document.getElementById('btn-mute')?.addEventListener('click', () => {
      const muted = window.soundEngine.toggleMute();
      const muteIcon = document.getElementById('mute-icon');
      if (muteIcon) muteIcon.textContent = muted ? '🔇' : '🔊';
      this.showToast(muted ? 'Sound Muted' : 'Sound Enabled', 'info');
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.togglePause();
    });

    document.getElementById('btn-open-terminal')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-terminal');
      this.refreshTerminalView();
    });

    document.getElementById('btn-open-dsa')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-dsa');
    });

    document.getElementById('btn-open-controls')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-controls');
    });

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        window.soundEngine.playClick();
        const targetId = btn.getAttribute('data-close');
        this.closeModal(targetId);
        if (targetId === 'modal-pause' && this.state === 'PAUSED') {
          this.state = 'PLAYING';
        }
      });
    });

    // Title Screen Start
    document.getElementById('btn-start-shift')?.addEventListener('click', () => {
      window.soundEngine.ensureContext();
      window.soundEngine.playClick();
      this.startShift();
    });

    document.getElementById('btn-title-dsa')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-dsa');
    });

    document.getElementById('btn-title-controls')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-controls');
    });

    // Play Again button on shift report
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.closeModal('modal-report');
      this.resetGame();
      this.startShift();
    });

    // Finish Point Checkpoint Buttons
    document.getElementById('btn-finish-point')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-terminal');
      this.refreshTerminalView();
    });

    document.getElementById('btn-banner-computer')?.addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openModal('modal-terminal');
      this.refreshTerminalView();
    });

    // Linked List Revenue Calculator Buttons
    document.getElementById('btn-run-calc')?.addEventListener('click', () => {
      this.runAutoCalculation();
    });

    document.getElementById('btn-step-calc')?.addEventListener('click', () => {
      this.stepCalculation();
    });

    document.getElementById('btn-reset-calc')?.addEventListener('click', () => {
      this.resetCalculation();
    });

    document.getElementById('btn-finalize-shift')?.addEventListener('click', () => {
      this.finalizeShiftFromCalculation();
    });

    // Restock buttons in Computer Terminal
    ['regular', 'premium', 'diesel'].forEach(ft => {
      const rBtn = document.getElementById(`btn-restock-${ft}`);
      if (rBtn) {
        rBtn.addEventListener('click', () => {
          window.soundEngine.playClick();
          this.fuelMap.restock(ft, 100);
          this.showToast(`Restocked +100L of ${ft.toUpperCase()}`, 'success');
          this.refreshTerminalView();
          this.updateHUD();
        });
      }
    });
  }

  bindDSACallbacks() {
    this.queue.onChange = () => this.updateQueueUI();
    this.transactionStack.onChange = () => this.updateStackUI();
    this.salesList.onChange = () => this.updateSalesUI();
    this.receiptList.onChange = () => this.refreshLinkedListUI();
  }

  // ==========================================
  // SHIFT LIFECYCLE
  // ==========================================
  startShift() {
    this.state = 'PLAYING';
    document.getElementById('screen-title')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');

    this.showToast('🚀 Shift Started! Welcome cars and serve them in FIFO order!', 'info');

    // Spawn first customer close to pump for instantaneous action
    this.spawnCar(6.0);
    setTimeout(() => {
      if (this.state === 'PLAYING') this.spawnCar(16.0);
    }, 2000);

    if (window.tamilVoice) {
      setTimeout(() => window.tamilVoice.onShiftStart(), 600);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('modal-pause').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('modal-pause').classList.add('hidden');
    }
  }

  endShift() {
    if (this.state === 'SHIFT_END') return;
    this.state = 'SHIFT_END';
    this.stopPumping();

    window.soundEngine.playSuccess();
    this.generateFinalReport();
    this.openModal('modal-report');
    if (window.tamilVoice) {
      setTimeout(() => window.tamilVoice.onShiftEnd(this.cash), 500);
    }
  }

  resetGame() {
    // Clear 3D world cars
    this.activeWorldCars.forEach(c => {
      this.scene.remove(c.mesh);
    });
    this.activeWorldCars = [];

    // Reset data structures
    this.queue = new CustomerQueue();
    this.transactionStack = new TransactionStack();
    this.fuelMap = new FuelHashMap();
    this.carOrderMap = new CarOrderMap();
    this.salesList = new DailySalesList();
    this.receiptList = new ReceiptLinkedList();
    this.bindDSACallbacks();

    // Reset metrics & Finish Point
    this.deactivateFinishPoint();
    this.resetCalculation();
    this.timeRemaining = this.shiftDuration;
    this.cash = 0.00;
    this.customersServed = 0;
    this.mistakesCount = 0;
    this.undoneCount = 0;
    this.satisfaction = 100;

    this.activeCar = null;
    this.activeOrder = null;
    this.isNozzleConnected = false;
    this.isPumping = false;
    this.isFuelCapAimed = false;
    this.deliveredLitres = 0.0;
    this.hoseMesh.visible = false;
    this.attendant.setHoldingNozzle(false);
    this.attendant.group.position.set(0.5, 0, 0.5);

    this.updateHUD();
    this.updateOrderCard();
  }

  // ==========================================
  // CAR SPAWNING, QUEUING & MOVEMENT
  // ==========================================
  spawnCar(initialZ = 32) {
    if (this.queue.size() >= 4) return; // Prevent queue crowding

    const carId = `CAR-${this.nextCarNum++}`;
    const type = CarBuilder.carTypes[Math.floor(Math.random() * CarBuilder.carTypes.length)];
    const color = CarBuilder.carPalette[Math.floor(Math.random() * CarBuilder.carPalette.length)];

    // Fuel request logic: sports cars prefer Premium, trucks prefer Diesel, others mostly Regular
    let requestedFuel = 'regular';
    const rand = Math.random();
    if (type === 'sports') {
      requestedFuel = rand < 0.75 ? 'premium' : 'regular';
    } else if (type === 'truck') {
      requestedFuel = rand < 0.8 ? 'diesel' : 'regular';
    } else {
      if (rand < 0.55) requestedFuel = 'regular';
      else if (rand < 0.8) requestedFuel = 'diesel';
      else requestedFuel = 'premium';
    }

    // Litres between 18.0 and 42.0 L
    const targetLitres = parseFloat((18 + Math.random() * 24).toFixed(1));
    const tankCapacity = parseFloat((targetLitres + 12 + Math.random() * 10).toFixed(1));

    // Create 3D Model
    const car3D = CarBuilder.createCar(type, color.hex);
    car3D.group.position.set(this.queueLaneX, 0, initialZ); // Start at initial Z position
    this.scene.add(car3D.group);

    // Hide fuel cap target ring until car is at pump
    if (car3D.fuelCapTarget) car3D.fuelCapTarget.visible = false;
    if (car3D.fuelCapHitMesh) car3D.fuelCapHitMesh.visible = false;

    const carData = {
      id: carId,
      modelType: type,
      colorName: color.name,
      colorHex: color.css,
      fuelType: requestedFuel,
      targetLitres: targetLitres,
      tankCapacity: tankCapacity,
      patience: 100.0,
      mesh: car3D.group,
      wheels: car3D.wheels,
      fuelPortOffset: car3D.fuelPortOffset,
      fuelCapTarget: car3D.fuelCapTarget,       // glowing ring mesh
      fuelCapHitMesh: car3D.fuelCapHitMesh,     // raycast target mesh
      state: 'ARRIVING', // ARRIVING, WAITING, SERVING, DEPARTING
      targetZ: this.queueSlotsZ[this.queue.size()] || 21.5,
      speed: 12.0
    };

    // 1. Store in Car Order Hash Map
    this.carOrderMap.setOrder(carId, carData);

    // 2. Enqueue in FIFO Queue
    this.queue.enqueue(carData);
    this.activeWorldCars.push(carData);

    window.soundEngine.playCarArrival();
    this.showToast(`🚗 New arrival: ${carId} (${type.toUpperCase()}) joined FIFO queue`, 'info');
  }

  updateWorldCars(delta) {
    for (let i = this.activeWorldCars.length - 1; i >= 0; i--) {
      const car = this.activeWorldCars[i];

      // Update Target Slot based on FIFO Queue Position
      const queuePos = this.queue.getPosition(car.id);

      if (queuePos === 1) {
        car.targetZ = this.queueSlotsZ[0]; // 0.0 (Pump island)
      } else if (queuePos > 1 && queuePos <= 4) {
        car.targetZ = this.queueSlotsZ[queuePos - 1];
      }

      // Driving Physics & Smooth Approach
      if (car.state !== 'DEPARTING') {
        const distZ = car.mesh.position.z - car.targetZ;
        if (Math.abs(distZ) > 0.08) {
          // Moving toward target slot
          const step = Math.sign(distZ) * -Math.min(Math.abs(distZ), car.speed * delta);
          car.mesh.position.z += step;

          // Rotate wheels while rolling
          car.wheels.forEach(w => {
            w.rotation.x -= step * 1.8;
          });

          // Headlights sway
          car.mesh.position.y = Math.sin(Date.now() * 0.01) * 0.02;
        } else {
          // Reached destination slot
          car.mesh.position.z = car.targetZ;
          car.mesh.position.y = 0;

          if (queuePos === 1 && car.state !== 'SERVING') {
            car.state = 'SERVING';
            this.setFrontCarAtPump(car);
          } else if (queuePos > 1) {
            car.state = 'WAITING';
          }
        }

        // Patience Meter Degradation
        if (car.state === 'WAITING' || car.state === 'SERVING') {
          // Waiting in queue drops patience faster; at pump is slower
          const decayRate = car.state === 'WAITING' ? 0.9 : 0.4;
          car.patience = Math.max(0, car.patience - decayRate * delta);

          // Impatient Customer Leaves Queue!
          if (car.patience <= 0 && car.state === 'WAITING') {
            this.handleCustomerWalkout(car);
          }
        }
      } else {
        // DEPARTING: Accelerate down exit road toward Z = -35
        const exitSpeed = 16.0;
        car.mesh.position.z -= exitSpeed * delta;
        car.wheels.forEach(w => {
          w.rotation.x += exitSpeed * delta * 1.8;
        });

        // Despawn once past station boundary
        if (car.mesh.position.z < -30) {
          // Hide fuel cap rings before removal
          if (car.fuelCapTarget) car.fuelCapTarget.visible = false;
          if (car.fuelCapHitMesh) car.fuelCapHitMesh.visible = false;
          this.scene.remove(car.mesh);
          this.activeWorldCars.splice(i, 1);
          this.carOrderMap.removeOrder(car.id);
        }
      }
    }
  }

  setFrontCarAtPump(car) {
    this.activeCar = car;
    this.activeOrder = this.carOrderMap.getOrder(car.id);
    this.deliveredLitres = 0.0;
    this.isNozzleConnected = false;
    this.isPumping = false;
    this.isFuelCapAimed = false;

    // Show fuel cap target ring now that car is at pump
    if (car.fuelCapTarget) car.fuelCapTarget.visible = true;
    if (car.fuelCapHitMesh) car.fuelCapHitMesh.visible = true;

    // Reset selected fuel to regular or keep previous
    this.updateOrderCard();
    this.showToast(`⛽ ${car.id} ready at pump! Aim nozzle at the glowing fuel cap ring to fill.`, 'info');

    if (window.tamilVoice && this.activeOrder) {
      setTimeout(() => window.tamilVoice.onCarArriveAtPump(car, this.activeOrder), 400);
    }
  }

  handleCustomerWalkout(car) {
    window.soundEngine.playHorn('angry');
    this.showToast(`😡 Impatient customer ${car.id} gave up and left the queue!`, 'error');

    if (window.tamilVoice) {
      window.tamilVoice.onCustomerWalkout(car);
    }

    // Penalize satisfaction and mistakes
    this.satisfaction = Math.max(10, this.satisfaction - 12);
    this.mistakesCount++;

    // Dequeue / remove from queue
    this.queue.removeCar(car.id);
    car.state = 'DEPARTING';

    this.updateHUD();
  }

  // ==========================================
  // FUELING & INTERACTION LOGIC
  // ==========================================
  toggleCameraMode() {
    if (this.cameraMode === 'FIRST_PERSON') {
      this.cameraMode = 'THIRD_PERSON';
      this.attendant.setFirstPerson(false);
      if (this.fpViewmodel) this.fpViewmodel.group.visible = false;
      document.getElementById('crosshair-wrapper')?.classList.add('hidden');
      const camBtn = document.getElementById('btn-toggle-camera');
      if (camBtn) camBtn.textContent = '🎥 3rd Person [V]';
      if (document.exitPointerLock && this.isPointerLocked) document.exitPointerLock();
      this.showToast('🎥 Switched to Elevated 3rd-Person Overview', 'info');
    } else {
      this.cameraMode = 'FIRST_PERSON';
      this.attendant.setFirstPerson(true);
      document.getElementById('crosshair-wrapper')?.classList.remove('hidden');
      const camBtn = document.getElementById('btn-toggle-camera');
      if (camBtn) camBtn.textContent = '🎥 1st Person [V]';
      this.showToast('🎥 Switched to First-Person Attendant Mode (Click to look)', 'info');
    }
  }

  updateRaycaster() {
    if (this.cameraMode !== 'FIRST_PERSON' || this.state !== 'PLAYING') {
      document.getElementById('crosshair-prompt')?.classList.add('hidden');
      document.querySelector('.crosshair-reticle')?.classList.remove('active');
      this.currentContextAction = null;
      this.isFuelCapAimed = false;
      return;
    }

    const promptEl = document.getElementById('crosshair-prompt');
    const promptText = document.getElementById('crosshair-prompt-text');
    const reticle = document.querySelector('.crosshair-reticle');

    let hitAction = null;
    let hitText = '';
    const playerPos = this.attendant.group.position;

    // ── Fuel Cap Aiming (Raycasting against the hit mesh) ──────────────────
    this.isFuelCapAimed = false;
    if (this.activeCar && this.activeCar.fuelCapHitMesh && this.activeCar.state === 'SERVING') {
      this.activeCar.fuelCapHitMesh.updateWorldMatrix(true, false);
      this.raycaster.setFromCamera(this.screenCenter, this.camera);
      const hits = this.raycaster.intersectObject(this.activeCar.fuelCapHitMesh, false);
      if (hits.length > 0) {
        this.isFuelCapAimed = true;
        // Highlight ring bright white when aimed
        if (this.activeCar.fuelCapTarget) {
          this.activeCar.fuelCapTarget.material.color.setHex(0xffffff);
          this.activeCar.fuelCapTarget.material.opacity = 1.0;
        }
      } else {
        // Dim ring to neon teal when not aimed
        if (this.activeCar.fuelCapTarget) {
          this.activeCar.fuelCapTarget.material.color.setHex(0x00ffcc);
          this.activeCar.fuelCapTarget.material.opacity = 0.9;
        }
      }
    }

    // Check front car at pump island
    if (this.activeCar && this.activeCar.state === 'SERVING') {
      const carPos = new THREE.Vector3(-3.2, 0.8, 0.0);
      const distToCar = playerPos.distanceTo(carPos);

      const toCar = carPos.clone().sub(this.camera.position).normalize();
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const dot = camDir.dot(toCar);

      if (distToCar < 5.8 && dot > 0.55) {
        if (!this.isNozzleConnected) {
          hitAction = 'CONNECT_NOZZLE';
          hitText = `Connect Nozzle to ${this.activeCar.id} [E]`;
        } else if (this.isFuelCapAimed && this.deliveredLitres < this.activeOrder.targetLitres) {
          hitAction = 'PUMP_FUEL_CAP';
          hitText = `✅ Nozzle on cap! Hold [Space] to pump (${this.deliveredLitres.toFixed(1)} / ${this.activeOrder.targetLitres.toFixed(1)} L)`;
        } else if (!this.isFuelCapAimed && this.isNozzleConnected && this.deliveredLitres < this.activeOrder.targetLitres) {
          hitAction = 'AIM_AT_CAP';
          hitText = `🎯 Aim at the glowing teal ring on the car to pump fuel!`;
        } else if (this.deliveredLitres >= this.activeOrder.targetLitres) {
          hitAction = 'FINISH_SALE';
          const cost = (this.deliveredLitres * this.fuelMap.get(this.selectedFuel).price).toFixed(2);
          hitText = `Collect Payment (₹${cost}) & Finish Sale [E]`;
        }
      }
    }

    // Check pump island dispenser
    if (!hitAction) {
      const pumpPos = new THREE.Vector3(0.0, 1.2, 0.0);
      const distToPump = playerPos.distanceTo(pumpPos);
      const toPump = pumpPos.clone().sub(this.camera.position).normalize();
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const dot = camDir.dot(toPump);

      if (distToPump < 4.2 && dot > 0.6) {
        hitAction = 'SELECT_FUEL';
        hitText = `Pump Dispenser: Press 1, 2, or 3 to select fuel type`;
      }
    }

    // Check station computer desk in shop
    if (!hitAction) {
      const shopDeskPos = new THREE.Vector3(-14.5, 1.2, 0.0);
      const distToDesk = playerPos.distanceTo(shopDeskPos);
      const toDesk = shopDeskPos.clone().sub(this.camera.position).normalize();
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const dot = camDir.dot(toDesk);

      if (distToDesk < 6.0 && dot > 0.45) {
        if (this.isFinishPointActive) {
          hitAction = 'OPEN_FINISH_COMPUTER';
          hitText = `🏁 FINISH POINT: Calculate Total on Station Computer [E]`;
        } else {
          hitAction = 'OPEN_TERMINAL';
          hitText = `Open Station Computer & DSA Terminal [E]`;
        }
      }
    }

    this.currentContextAction = hitAction;
    if (hitAction) {
      if (promptText) promptText.textContent = hitText;
      promptEl?.classList.remove('hidden');
      // Highlight crosshair differently when aimed at fuel cap
      if (hitAction === 'PUMP_FUEL_CAP') {
        reticle?.classList.add('active', 'fuel-cap-aimed');
      } else {
        reticle?.classList.remove('fuel-cap-aimed');
        reticle?.classList.add('active');
      }
    } else {
      promptEl?.classList.add('hidden');
      reticle?.classList.remove('active', 'fuel-cap-aimed');
    }
  }

  selectFuelType(fuelType) {
    this.selectedFuel = fuelType;
    ['regular', 'premium', 'diesel'].forEach(ft => {
      const btn = document.getElementById(`fuel-btn-${ft}`);
      if (btn) {
        if (ft === fuelType) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    const fuel = this.fuelMap.get(fuelType);
    const colorHex = fuel.color === '#38bdf8' ? 0x38bdf8 : fuel.color === '#c084fc' ? 0xa855f7 : 0x22c55e;
    if (this.attendant.heldNozzle.visible) {
      this.attendant.setHoldingNozzle(true, colorHex);
    }
    if (this.fpViewmodel) {
      this.fpViewmodel.setNozzleColor(colorHex);
    }

    this.updateOrderCard();
  }

  toggleNozzleConnection() {
    if (!this.activeCar || this.activeCar.state !== 'SERVING') {
      this.showToast('No car ready at the pump to connect nozzle!', 'warning');
      window.soundEngine.playError();
      return;
    }

    this.isNozzleConnected = !this.isNozzleConnected;
    const connectBtn = document.getElementById('btn-connect-nozzle');

    if (this.isNozzleConnected) {
      this.attendant.setHoldingNozzle(false);
      this.hoseMesh.visible = true;
      if (connectBtn) {
        connectBtn.textContent = '🔌 Disconnect';
        connectBtn.classList.add('connected');
      }
      this.showToast('Nozzle connected to vehicle fuel port. Ready to pump!', 'success');
      if (window.tamilVoice) {
        window.tamilVoice.onNozzleConnected(this.activeCar);
      }
    } else {
      this.stopPumping();
      this.hoseMesh.visible = false;
      if (connectBtn) {
        connectBtn.textContent = '🔌 Connect [E]';
        connectBtn.classList.remove('connected');
      }
      this.showToast('Nozzle disconnected and returned to holster.', 'info');
    }
  }

  startPumping() {
    if (!this.activeCar || this.activeCar.state !== 'SERVING') {
      this.showToast('No car at the pump to receive fuel!', 'warning');
      window.soundEngine.playError();
      return;
    }

    if (!this.isNozzleConnected) {
      this.showToast('Connect the fuel nozzle to the car first! (Click Connect or press E)', 'warning');
      window.soundEngine.playError();
      return;
    }

    // Check if player is aiming at the fuel cap (only required in first-person mode)
    if (this.cameraMode === 'FIRST_PERSON' && !this.isFuelCapAimed) {
      this.showToast('🎯 Aim crosshair at the glowing teal ring on the car to pump!', 'warning');
      window.soundEngine.playError();
      return;
    }

    // Check Fuel Stock via Hash Map
    const fuel = this.fuelMap.get(this.selectedFuel);
    if (!fuel || fuel.stock <= 0) {
      this.showToast(`❌ Out of ${this.selectedFuel.toUpperCase()} stock! Restock via Station Computer.`, 'error');
      window.soundEngine.playError();
      return;
    }

    // Check wrong fuel selection mistake
    if (this.selectedFuel !== this.activeOrder.fuelType && !this.activeCar.warnedWrongFuel) {
      this.activeCar.warnedWrongFuel = true;
      this.mistakesCount++;
      this.satisfaction = Math.max(10, this.satisfaction - 15);
      this.showToast(`⚠️ WRONG FUEL! Car requested ${this.activeOrder.fuelType.toUpperCase()}, but you're dispensing ${this.selectedFuel.toUpperCase()}!`, 'error');
      window.soundEngine.playError();
      if (window.tamilVoice) {
        window.tamilVoice.onWrongFuelWarning(this.activeOrder.fuelType, this.selectedFuel);
      }
      this.updateHUD();
    }

    this.isPumping = true;
    window.soundEngine.startPumpSound();
    document.getElementById('btn-pump-fuel')?.classList.add('pumping');
  }

  stopPumping() {
    if (!this.isPumping) return;
    this.isPumping = false;
    window.soundEngine.stopPumpSound();
    document.getElementById('btn-pump-fuel')?.classList.remove('pumping');
  }

  updateFuelFlow(delta) {
    if (!this.isPumping || !this.activeCar) return;

    // In first-person, stop pumping if player moves crosshair away from fuel cap
    if (this.cameraMode === 'FIRST_PERSON' && !this.isFuelCapAimed) {
      this.stopPumping();
      this.showToast('🎯 Keep crosshair on the teal cap ring to pump continuously!', 'warning');
      return;
    }

    const flowRate = 6.0; // Litres per second
    const requested = this.activeOrder.targetLitres;

    if (this.deliveredLitres >= requested) {
      // Auto-stop when reached target requested
      this.stopPumping();
      const currentCost = (requested * this.fuelMap.get(this.selectedFuel).price).toFixed(2);
      this.showToast(`✅ Tank filled to requested ${requested.toFixed(1)} L! Ready for payment.`, 'success');
      if (window.tamilVoice) {
        window.tamilVoice.onPumpingTargetReached(requested, currentCost);
      }
      return;
    }

    const dispenseAmount = Math.min(flowRate * delta, requested - this.deliveredLitres);
    const result = this.fuelMap.dispense(this.selectedFuel, dispenseAmount);

    if (result.success) {
      this.deliveredLitres += result.delivered;
    } else {
      this.deliveredLitres += (result.delivered || 0);
      this.stopPumping();
      this.showToast(`⚠️ Dispenser stopped: ${result.reason}`, 'warning');
    }

    this.updateOrderCard();
  }

  handleContextInteract() {
    if (this.currentContextAction === 'OPEN_TERMINAL' || this.currentContextAction === 'OPEN_FINISH_COMPUTER') {
      this.openModal('modal-terminal');
      this.refreshTerminalView();
      return;
    }

    if (this.currentContextAction === 'CONNECT_NOZZLE' || (!this.isNozzleConnected && this.activeCar)) {
      this.toggleNozzleConnection();
      return;
    }

    if (this.currentContextAction === 'FINISH_SALE' || (this.isNozzleConnected && this.deliveredLitres >= (this.activeOrder ? this.activeOrder.targetLitres * 0.95 : 1000))) {
      this.completeSale();
      return;
    }

    if (this.isNozzleConnected) {
      this.toggleNozzleConnection();
      return;
    }
  }

  // ==========================================
  // SALE COMPLETION & STACK PUSH
  // ==========================================
  completeSale() {
    if (!this.activeCar || this.activeCar.state !== 'SERVING') {
      this.showToast('No customer currently at pump to complete sale!', 'warning');
      window.soundEngine.playError();
      return;
    }

    if (this.deliveredLitres < 1.0) {
      this.showToast('Please pump fuel first before taking payment!', 'warning');
      window.soundEngine.playError();
      return;
    }

    // Disconnect nozzle
    if (this.isNozzleConnected) {
      this.toggleNozzleConnection();
    }

    const fuel = this.fuelMap.get(this.selectedFuel);
    const saleCost = parseFloat((this.deliveredLitres * fuel.price).toFixed(2));
    const txId = `TX-${this.nextTxNum++}`;

    const transaction = {
      id: txId,
      carId: this.activeCar.id,
      fuelType: this.selectedFuel,
      fuelName: fuel.name,
      litres: parseFloat(this.deliveredLitres.toFixed(1)),
      pricePerLitre: fuel.price,
      total: saleCost,
      timestamp: new Date().toLocaleTimeString(),
      satisfactionAtSale: Math.round(this.activeCar.patience),
      canUndo: true
    };

    // 1. PUSH onto Transaction Stack (LIFO)
    this.transactionStack.push(transaction);
    this.lastUndoSale = transaction;

    // 2. APPEND to Daily Sales List (Array)
    this.salesList.append(transaction);

    // 3. APPEND to Receipt Singly Linked List (Sequential Node Chain)
    this.receiptList.append(transaction);

    // Update cash and stats
    this.cash += saleCost;
    this.customersServed++;

    // Adjust satisfaction
    if (this.activeCar.patience > 70) {
      this.satisfaction = Math.min(100, this.satisfaction + 3);
    }

    window.soundEngine.playCashChime();
    this.showToast(`💰 Payment Received: ₹${saleCost.toFixed(2)} recorded on station terminal!`, 'success');

    // 4. Dequeue Front Car (FIFO Queue)
    const departedCar = this.queue.dequeue();
    departedCar.state = 'DEPARTING';

    // Play horn and departure sound
    window.soundEngine.playHorn('happy');
    window.soundEngine.playCarDeparture();

    if (window.tamilVoice) {
      window.tamilVoice.onPaymentCollected(departedCar, saleCost.toFixed(2));
    }

    // Reset pump active state
    this.activeCar = null;
    this.activeOrder = null;
    this.deliveredLitres = 0.0;
    this.updateOrderCard();
    this.updateHUD();

    // Enable Undo Button
    const undoBtn = document.getElementById('btn-undo-sale');
    if (undoBtn) undoBtn.removeAttribute('disabled');

    // Check Shift Finish Criteria (10 Customers -> Activate Finish Point)
    if (this.customersServed >= this.targetCustomers && !this.isFinishPointActive) {
      this.activateFinishPoint();
    }
  }

  // ==========================================
  // UNDO LAST SALE (STACK POP & ARRAY REVERSAL)
  // ==========================================
  undoLastSale() {
    if (this.transactionStack.isEmpty()) {
      this.showToast('No transaction in stack to undo!', 'warning');
      window.soundEngine.playError();
      return;
    }

    const topSale = this.transactionStack.peek();
    if (!topSale || !topSale.canUndo) {
      this.showToast('Undo unavailable: only the immediately completed sale can be undone!', 'warning');
      window.soundEngine.playError();
      return;
    }

    // 1. POP from Transaction Stack
    const undoneSale = this.transactionStack.pop();

    // 2. REVERSE from Daily Sales List
    this.salesList.removeById(undoneSale.id);

    // 3. REMOVE from Receipt Singly Linked List
    this.receiptList.removeById(undoneSale.id);

    // 4. REVERSE Cash and Restock Fuel
    this.cash = Math.max(0, this.cash - undoneSale.total);
    this.fuelMap.restock(undoneSale.fuelType, undoneSale.litres);
    this.customersServed = Math.max(0, this.customersServed - 1);
    this.undoneCount++;

    // Deactivate finish point if undone drops below 10
    if (this.isFinishPointActive && this.customersServed < this.targetCustomers) {
      this.deactivateFinishPoint();
    }

    window.soundEngine.playUndo();
    this.showToast(`↩️ Transaction ${undoneSale.id} UNDONE: -₹${undoneSale.total.toFixed(2)} refunded, +${undoneSale.litres}L restocked!`, 'info');

    if (window.tamilVoice) {
      window.tamilVoice.onUndoSale(undoneSale);
    }

    // Disable undo button until next sale
    const undoBtn = document.getElementById('btn-undo-sale');
    if (undoBtn) undoBtn.setAttribute('disabled', 'true');

    this.updateHUD();
    this.refreshTerminalView();
  }

  // ==========================================
  // UI UPDATES & HUD
  // ==========================================
  updateHUD() {
    const cashEl = document.getElementById('hud-cash');
    if (cashEl) cashEl.textContent = `₹${this.cash.toFixed(2)}`;

    const timeEl = document.getElementById('hud-timer');
    if (timeEl) {
      const mins = Math.floor(this.timeRemaining / 60);
      const secs = Math.floor(this.timeRemaining % 60);
      timeEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    const custEl = document.getElementById('hud-customers');
    if (custEl) custEl.textContent = `${this.customersServed} / ${this.targetCustomers}`;

    const satEl = document.getElementById('hud-satisfaction');
    if (satEl) {
      satEl.textContent = `${Math.round(this.satisfaction)}%`;
      satEl.className = 'val ' + (this.satisfaction > 75 ? 'good' : this.satisfaction > 40 ? 'med' : 'bad');
    }

    const mistEl = document.getElementById('hud-mistakes');
    if (mistEl) mistEl.textContent = `${this.mistakesCount}`;
  }

  updateQueueUI() {
    const listEl = document.getElementById('queue-items-container');
    if (!listEl) return;

    listEl.innerHTML = '';
    const cars = this.queue.toArray();

    if (cars.length === 0) {
      listEl.innerHTML = '<div class="empty-queue-msg">Queue empty — cars arriving shortly...</div>';
      return;
    }

    cars.forEach((car, idx) => {
      const pos = idx + 1;
      const isServing = pos === 1;
      const item = document.createElement('div');
      item.className = `queue-card ${isServing ? 'serving' : ''}`;

      const fuelBadgeClass = `badge-${car.fuelType}`;

      item.innerHTML = `
        <div class="queue-card-top">
          <span class="queue-slot-badge">${isServing ? '⭐ #1 (AT PUMP)' : `#${pos} in line`}</span>
          <span class="queue-car-id" style="color: ${car.colorHex}">● ${car.id}</span>
        </div>
        <div class="queue-card-mid">
          <span class="badge ${fuelBadgeClass}">${car.fuelType.toUpperCase()}</span>
          <span class="queue-vol">${car.targetLitres} L</span>
        </div>
        <div class="patience-track">
          <div class="patience-bar" style="width: ${Math.max(0, car.patience)}%; background: ${car.patience > 50 ? '#22c55e' : car.patience > 25 ? '#eab308' : '#ef4444'}"></div>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  updateOrderCard() {
    const cardEl = document.getElementById('dispenser-panel');
    if (!cardEl) return;

    if (!this.activeCar || this.activeCar.state !== 'SERVING') {
      document.getElementById('dispenser-empty').classList.remove('hidden');
      document.getElementById('dispenser-active').classList.add('hidden');
      return;
    }

    document.getElementById('dispenser-empty').classList.add('hidden');
    document.getElementById('dispenser-active').classList.remove('hidden');

    const car = this.activeCar;
    const order = this.activeOrder;
    const selectedFuelObj = this.fuelMap.get(this.selectedFuel);
    const requestedFuelObj = this.fuelMap.get(order.fuelType);

    document.getElementById('order-car-id').textContent = car.id;
    document.getElementById('order-car-model').textContent = `${car.colorName} ${car.modelType.toUpperCase()}`;

    const reqBadge = document.getElementById('order-requested-fuel');
    reqBadge.textContent = requestedFuelObj.name;
    reqBadge.className = `badge badge-${order.fuelType}`;

    document.getElementById('order-target-litres').textContent = `${order.targetLitres.toFixed(1)} L`;
    document.getElementById('order-tank-cap').textContent = `Max: ${order.tankCapacity.toFixed(1)} L`;

    // Flow & Cost calculations
    document.getElementById('dispenser-delivered-litres').textContent = `${this.deliveredLitres.toFixed(1)} L`;
    const curCost = this.deliveredLitres * selectedFuelObj.price;
    document.getElementById('dispenser-current-cost').textContent = `₹${curCost.toFixed(2)}`;

    // Progress bar
    const pct = Math.min(100, (this.deliveredLitres / order.targetLitres) * 100);
    document.getElementById('dispenser-progress-fill').style.width = `${pct}%`;

    // Mismatch warning
    const mismatchWarning = document.getElementById('fuel-mismatch-warning');
    if (this.selectedFuel !== order.fuelType) {
      mismatchWarning.classList.remove('hidden');
      mismatchWarning.textContent = `⚠️ Selected ${selectedFuelObj.name} does NOT match requested ${requestedFuelObj.name}!`;
    } else {
      mismatchWarning.classList.add('hidden');
    }

    // Stock meter
    const stockEl = document.getElementById('dispenser-stock-info');
    if (stockEl) {
      stockEl.textContent = `Dispenser Stock: ${selectedFuelObj.stock.toFixed(0)} L / ₹${selectedFuelObj.price.toFixed(2)} per L`;
    }
  }

  updateStackUI() {
    // Updates Transaction Stack view in Computer Terminal
    const stackContainer = document.getElementById('terminal-stack-list');
    if (!stackContainer) return;

    stackContainer.innerHTML = '';
    const stackItems = this.transactionStack.toArray();

    if (stackItems.length === 0) {
      stackContainer.innerHTML = '<div class="terminal-empty">No transactions logged in stack yet.</div>';
      return;
    }

    stackItems.forEach((tx, idx) => {
      const isTop = idx === 0;
      const el = document.createElement('div');
      el.className = `stack-entry ${isTop ? 'top-of-stack' : ''}`;
      el.innerHTML = `
        <div class="stack-entry-header">
          <span class="stack-pos">${isTop ? '🔺 TOP (LIFO)' : `Layer [${stackItems.length - idx}]`}</span>
          <span class="stack-id">${tx.id}</span>
          <span class="stack-time">${tx.timestamp}</span>
        </div>
        <div class="stack-entry-body">
          <span>${tx.carId} • ${tx.fuelName}</span>
          <span>${tx.litres}L @ ₹${tx.pricePerLitre.toFixed(2)}/L</span>
          <span class="stack-price">₹${tx.total.toFixed(2)}</span>
        </div>
      `;
      stackContainer.appendChild(el);
    });
  }

  updateSalesUI() {
    // Array list updates handled in terminal and final report
  }

  refreshTerminalView() {
    // 1. Fuel Hash Map View
    const fuels = this.fuelMap.getAll();
    ['regular', 'premium', 'diesel'].forEach(ft => {
      const data = fuels[ft];
      if (data) {
        const stockPct = (data.stock / data.maxStock) * 100;
        const bar = document.getElementById(`term-stock-bar-${ft}`);
        if (bar) bar.style.width = `${stockPct}%`;
        const text = document.getElementById(`term-stock-text-${ft}`);
        if (text) text.textContent = `${data.stock.toFixed(1)} / ${data.maxStock} L`;
        const price = document.getElementById(`term-price-${ft}`);
        if (price) price.textContent = `₹${data.price.toFixed(2)}/L`;
      }
    });

    // 2. Transaction Stack View
    this.updateStackUI();

    // 3. Daily Sales Array Summary View
    const report = this.salesList.generateReport();
    document.getElementById('term-total-rev').textContent = `₹${report.totalRevenue.toFixed(2)}`;
    document.getElementById('term-total-vol').textContent = `${report.totalLitres.toFixed(1)} L`;
    document.getElementById('term-active-count').textContent = `${report.activeTransactions}`;
    document.getElementById('term-avg-ticket').textContent = `₹${report.averageTicket.toFixed(2)}`;

    // 4. Singly Linked List Chain & Calculator View
    this.refreshLinkedListUI();
  }

  // ==========================================
  // FINISH POINT & SETTLEMENT LIFECYCLE
  // ==========================================
  activateFinishPoint() {
    this.isFinishPointActive = true;
    this.isCalculationDone = false;

    // Show 3D Beacon at the shop computer desk
    if (this.station && this.station.finishMarker) {
      this.station.finishMarker.setVisible(true);
    }

    // Show HUD banners & buttons
    document.getElementById('finish-point-banner')?.classList.remove('hidden');
    document.getElementById('btn-finish-point')?.classList.remove('hidden');
    document.getElementById('term-finish-indicator')?.classList.remove('hidden');

    window.soundEngine.playCheckpointReached();
    this.showToast('🏁 10 CARS COMPLETED! Head to the Station Computer in the shop to calculate shift total & finalize accounts!', 'success');

    if (window.tamilVoice) {
      window.tamilVoice.onFinishPointReached();
    }
  }

  deactivateFinishPoint() {
    this.isFinishPointActive = false;
    this.isCalculationDone = false;

    if (this.station && this.station.finishMarker) {
      this.station.finishMarker.setVisible(false);
    }

    document.getElementById('finish-point-banner')?.classList.add('hidden');
    document.getElementById('btn-finish-point')?.classList.add('hidden');
    document.getElementById('term-finish-indicator')?.classList.add('hidden');
    document.getElementById('btn-finalize-shift')?.classList.add('hidden');
  }

  // ==========================================
  // SINGLY LINKED LIST: REVENUE CALCULATOR
  // ==========================================
  refreshLinkedListUI(activeNodeId = null) {
    const container = document.getElementById('ll-nodes-track');
    const counterEl = document.getElementById('ll-node-counter');
    if (!container) return;

    const nodes = this.receiptList.toArray();
    if (counterEl) {
      counterEl.textContent = `${nodes.length} Nodes in Chain ${nodes.length >= 10 ? '(Complete)' : ''}`;
    }

    if (nodes.length === 0) {
      container.innerHTML = `
        <div class="ll-empty-msg">
          <span>🔗 Linked list is empty. Complete vehicle fuel sales at the pump to append receipt nodes to the chain!</span>
        </div>
      `;
      return;
    }

    let html = `
      <div class="ll-pointer-tag head-tag">
        <span class="pt-label">HEAD ➔</span>
      </div>
    `;

    nodes.forEach((n, idx) => {
      const isTarget = activeNodeId === n.id;
      html += `
        <div class="ll-node ${isTarget ? 'active-traversing' : ''}" id="ll-node-${n.id}">
          <div class="ll-node-head">
            <span class="node-idx">#${idx + 1}</span>
            <span class="node-id">${n.id}</span>
          </div>
          <div class="ll-node-car">${n.carId}</div>
          <div class="ll-node-fuel">${n.fuelName} • ${n.litres}L</div>
          <div class="ll-node-total">₹${n.total.toFixed(2)}</div>
          <div class="ll-node-ptr">
            <span class="ptr-key">.next:</span>
            <span class="ptr-val">${n.hasNext ? n.nextId : 'null (TAIL)'}</span>
          </div>
        </div>
      `;

      if (n.hasNext) {
        html += `
          <div class="ll-arrow">
            <span>➔</span>
          </div>
        `;
      } else {
        html += `
          <div class="ll-pointer-tag tail-tag">
            <span>➔ TAIL (null)</span>
          </div>
        `;
      }
    });

    container.innerHTML = html;

    // Scroll active node into view if traversing
    if (activeNodeId) {
      const activeEl = document.getElementById(`ll-node-${activeNodeId}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }

  runAutoCalculation() {
    if (this.calcAnimTimer) {
      clearInterval(this.calcAnimTimer);
      this.calcAnimTimer = null;
    }

    const calcResult = this.receiptList.calculateTotal();
    if (calcResult.count === 0) {
      this.showToast('No receipt nodes in linked list to calculate!', 'warning');
      window.soundEngine.playError();
      return;
    }

    // Reset accumulator for animation
    this.calcRunningTotal = 0.00;
    this.calcRunningLitres = 0.0;
    this.calcStepIndex = 0;
    const steps = calcResult.steps;

    const amountEl = document.getElementById('calc-display-amount');
    const litresEl = document.getElementById('calc-display-litres');
    const countEl = document.getElementById('calc-display-count');
    const ptrEl = document.getElementById('calc-display-ptr');
    const statusText = document.getElementById('calc-status-text');
    const statusBadge = document.getElementById('calc-status-badge');
    const reconcileMsg = document.getElementById('calc-reconcile-msg');
    const finalizeBtn = document.getElementById('btn-finalize-shift');

    if (statusText) statusText.textContent = 'Traversing Linked List...';
    if (statusBadge) statusBadge.className = 'calc-status-badge calculating';
    if (reconcileMsg) reconcileMsg.classList.add('hidden');
    if (finalizeBtn) finalizeBtn.classList.add('hidden');

    this.calcAnimTimer = setInterval(() => {
      if (this.calcStepIndex < steps.length) {
        const step = steps[this.calcStepIndex];
        this.calcRunningTotal = step.accumulatedTotal;
        this.calcRunningLitres += step.litres;

        if (amountEl) amountEl.textContent = `₹${this.calcRunningTotal.toFixed(2)}`;
        if (litresEl) litresEl.textContent = `${this.calcRunningLitres.toFixed(1)} L`;
        if (countEl) countEl.textContent = `${step.step} / ${steps.length} cars`;
        if (ptrEl) ptrEl.textContent = `Node: ${step.nodeId} (${step.carId}) ➔ ${step.step < steps.length ? steps[step.step].nodeId : 'null'}`;

        this.refreshLinkedListUI(step.nodeId);
        window.soundEngine.playCalcBeep(520 + this.calcStepIndex * 40);

        this.calcStepIndex++;
      } else {
        clearInterval(this.calcAnimTimer);
        this.calcAnimTimer = null;
        this.isCalculationDone = true;

        if (amountEl) amountEl.textContent = `₹${calcResult.totalAmount.toFixed(2)}`;
        if (litresEl) litresEl.textContent = `${calcResult.totalLitres.toFixed(1)} L`;
        if (countEl) countEl.textContent = `${calcResult.count} / ${calcResult.count} cars (All processed)`;
        if (ptrEl) ptrEl.textContent = `TAIL reached (null)`;
        if (statusText) statusText.textContent = '✅ Verified & Reconciled';
        if (statusBadge) statusBadge.className = 'calc-status-badge success';
        if (reconcileMsg) reconcileMsg.classList.remove('hidden');
        if (finalizeBtn) finalizeBtn.classList.remove('hidden');

        window.soundEngine.playTotalCalculated();
        this.showToast(`🧮 Total Calculated: ₹${calcResult.totalAmount.toFixed(2)} across ${calcResult.count} cars in linked list!`, 'success');
      }
    }, 220);
  }

  stepCalculation() {
    const calcResult = this.receiptList.calculateTotal();
    const steps = calcResult.steps;
    if (steps.length === 0) {
      this.showToast('No receipt nodes in linked list to step through!', 'warning');
      window.soundEngine.playError();
      return;
    }

    if (this.calcStepIndex >= steps.length) {
      this.showToast('All nodes already traversed! Click Reset to restart calculation.', 'info');
      return;
    }

    const step = steps[this.calcStepIndex];
    this.calcRunningTotal = step.accumulatedTotal;
    this.calcRunningLitres += step.litres;

    document.getElementById('calc-display-amount').textContent = `₹${this.calcRunningTotal.toFixed(2)}`;
    document.getElementById('calc-display-litres').textContent = `${this.calcRunningLitres.toFixed(1)} L`;
    document.getElementById('calc-display-count').textContent = `${step.step} / ${steps.length} cars`;
    document.getElementById('calc-display-ptr').textContent = `Node: ${step.nodeId} ➔ ${step.step < steps.length ? steps[step.step].nodeId : 'null'}`;

    this.refreshLinkedListUI(step.nodeId);
    window.soundEngine.playCalcBeep(520 + this.calcStepIndex * 40);
    this.calcStepIndex++;

    if (this.calcStepIndex >= steps.length) {
      this.isCalculationDone = true;
      document.getElementById('calc-status-text').textContent = '✅ Verified & Reconciled';
      document.getElementById('calc-status-badge').className = 'calc-status-badge success';
      document.getElementById('calc-reconcile-msg')?.classList.remove('hidden');
      document.getElementById('btn-finalize-shift')?.classList.remove('hidden');
      window.soundEngine.playTotalCalculated();
    }
  }

  resetCalculation() {
    if (this.calcAnimTimer) {
      clearInterval(this.calcAnimTimer);
      this.calcAnimTimer = null;
    }
    this.calcRunningTotal = 0.00;
    this.calcRunningLitres = 0.0;
    this.calcStepIndex = 0;
    this.isCalculationDone = false;

    document.getElementById('calc-display-amount').textContent = '₹0.00';
    document.getElementById('calc-display-litres').textContent = '0.0 L';
    document.getElementById('calc-display-count').textContent = `0 / ${this.receiptList.count} cars`;
    document.getElementById('calc-display-ptr').textContent = 'HEAD';
    document.getElementById('calc-status-text').textContent = 'Awaiting Calculation';
    document.getElementById('calc-status-badge').className = 'calc-status-badge';
    document.getElementById('calc-reconcile-msg')?.classList.add('hidden');
    document.getElementById('btn-finalize-shift')?.classList.add('hidden');

    this.refreshLinkedListUI();
    window.soundEngine.playClick();
  }

  finalizeShiftFromCalculation() {
    window.soundEngine.playSuccess();
    this.closeModal('modal-terminal');
    this.endShift();
  }

  generateFinalReport() {
    const report = this.salesList.generateReport();

    document.getElementById('rep-total-sales').textContent = `₹${report.totalRevenue.toFixed(2)}`;
    document.getElementById('rep-total-litres').textContent = `${report.totalLitres.toFixed(1)} L`;
    document.getElementById('rep-customers-served').textContent = `${this.customersServed}`;
    document.getElementById('rep-avg-ticket').textContent = `₹${report.averageTicket.toFixed(2)}`;
    document.getElementById('rep-mistakes').textContent = `${this.mistakesCount}`;
    document.getElementById('rep-undone').textContent = `${this.undoneCount}`;
    document.getElementById('rep-satisfaction').textContent = `${Math.round(this.satisfaction)}%`;

    // Fuel breakdown table
    const tbody = document.getElementById('rep-breakdown-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td><span class="badge badge-regular">Regular 87</span></td>
          <td>${report.fuelBreakdown.regular.count}</td>
          <td>${report.fuelBreakdown.regular.litres.toFixed(1)} L</td>
          <td>₹${report.fuelBreakdown.regular.revenue.toFixed(2)}</td>
        </tr>
        <tr>
          <td><span class="badge badge-premium">Premium 93</span></td>
          <td>${report.fuelBreakdown.premium.count}</td>
          <td>${report.fuelBreakdown.premium.litres.toFixed(1)} L</td>
          <td>₹${report.fuelBreakdown.premium.revenue.toFixed(2)}</td>
        </tr>
        <tr>
          <td><span class="badge badge-diesel">Diesel Bio</span></td>
          <td>${report.fuelBreakdown.diesel.count}</td>
          <td>${report.fuelBreakdown.diesel.litres.toFixed(1)} L</td>
          <td>₹${report.fuelBreakdown.diesel.revenue.toFixed(2)}</td>
        </tr>
      `;
    }

    // Star rating
    let stars = '⭐⭐⭐⭐⭐';
    let grade = 'Master Attendant (S Rank)';
    if (this.satisfaction < 50 || this.mistakesCount > 3) {
      stars = '⭐⭐';
      grade = 'Rookie Training Needed (C Rank)';
    } else if (this.satisfaction < 75 || this.mistakesCount > 1) {
      stars = '⭐⭐⭐';
      grade = 'Competent Attendant (B Rank)';
    } else if (this.satisfaction < 90) {
      stars = '⭐⭐⭐⭐';
      grade = 'Senior Attendant (A Rank)';
    }
    document.getElementById('rep-rating-stars').textContent = stars;
    document.getElementById('rep-rating-grade').textContent = grade;
  }

  // Toast System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }

  // Modals
  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  // ==========================================
  // GAME LOOP & ANIMATION
  // ==========================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'PLAYING') {
      // Shift timer countdown (pauses when 10 cars finish point is reached)
      if (!this.isFinishPointActive) {
        this.timeRemaining -= delta;
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          this.endShift();
        }
      }

      // Player Movement & Camera Control
      if (this.cameraMode === 'FIRST_PERSON') {
        const forward = new THREE.Vector3(-Math.sin(this.fpYaw), 0, -Math.cos(this.fpYaw));
        const right = new THREE.Vector3(Math.cos(this.fpYaw), 0, -Math.sin(this.fpYaw));
        const moveVec = new THREE.Vector3();

        if (this.keys['w'] || this.keys['arrowup']) moveVec.add(forward);
        if (this.keys['s'] || this.keys['arrowdown']) moveVec.sub(forward);
        if (this.keys['a'] || this.keys['arrowleft']) moveVec.sub(right);
        if (this.keys['d'] || this.keys['arrowright']) moveVec.add(right);

        const isMoving = moveVec.lengthSq() > 0.001;
        if (isMoving) {
          moveVec.normalize();
          this.walkBobTimer += delta * 12;
          this.attendant.group.position.x += moveVec.x * this.attendant.speed * delta;
          this.attendant.group.position.z += moveVec.z * this.attendant.speed * delta;
        }

        // Station boundary clamping
        this.attendant.group.position.x = Math.max(-12, Math.min(9, this.attendant.group.position.x));
        this.attendant.group.position.z = Math.max(-14, Math.min(18, this.attendant.group.position.z));
        this.attendant.group.rotation.y = this.fpYaw;

        // Eye Level Camera Position with subtle head bob
        const headBob = isMoving ? Math.sin(this.walkBobTimer) * 0.04 : 0;
        const sideSway = isMoving ? Math.cos(this.walkBobTimer * 0.5) * 0.02 : 0;

        this.camera.position.set(
          this.attendant.group.position.x + sideSway,
          1.68 + headBob,
          this.attendant.group.position.z
        );

        this.camera.rotation.set(0, 0, 0);
        this.camera.rotation.y = this.fpYaw;
        this.camera.rotation.x = this.fpPitch;

        // Viewmodel visibility & sway
        if (this.fpViewmodel) {
          const showVM = !this.isNozzleConnected;
          this.fpViewmodel.group.visible = showVM;

          if (showVM) {
            const recoil = this.isPumping ? (Math.random() - 0.5) * 0.012 : 0;
            this.fpViewmodel.group.position.set(
              recoil,
              (isMoving ? Math.sin(this.walkBobTimer) * 0.015 : 0) + recoil,
              recoil
            );
          }
        }

        // Interactive Raycaster
        this.updateRaycaster();

      } else {
        // Third Person Camera
        this.camera.position.set(13, 11, 16);
        this.camera.lookAt(-2, 1.2, 4);

        this.moveDir.set(0, 0, 0);
        if (this.keys['w'] || this.keys['arrowup']) this.moveDir.z -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) this.moveDir.z += 1;
        if (this.keys['a'] || this.keys['arrowleft']) this.moveDir.x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) this.moveDir.x += 1;

        this.attendant.update(delta, this.moveDir);
      }

      // Car movement & queue flow
      this.updateWorldCars(delta);

      // Pumping fuel flow
      this.updateFuelFlow(delta);

      // Hose curve attachment
      this.updateDynamicHose();

      // Fuel cap ring pulsing animation
      if (this.activeCar && this.activeCar.fuelCapTarget && this.activeCar.fuelCapTarget.visible) {
        this.fuelCapRingTimer += delta * (this.isFuelCapAimed ? 8.0 : 3.0);
        const pulse = 1.0 + Math.sin(this.fuelCapRingTimer) * (this.isFuelCapAimed ? 0.25 : 0.12);
        this.activeCar.fuelCapTarget.scale.set(pulse, pulse, pulse);
        // When pumping, flash green
        if (this.isPumping) {
          const flash = 0.5 + 0.5 * Math.sin(this.fuelCapRingTimer * 4);
          this.activeCar.fuelCapTarget.material.color.setRGB(flash, 1.0, 0.8 + flash * 0.2);
        }
      }

      // Car spawn timer (halt when 10 customers reached or finish point active)
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval && this.customersServed < this.targetCustomers && !this.isFinishPointActive) {
        this.spawnTimer = 0;
        this.spawnCar();
      }

      // Update 3D Finish Point Beacon & Checkpoint Marker
      if (this.station && this.station.finishMarker) {
        this.station.finishMarker.update(delta);
      }

      // Periodic HUD refresh
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.pumpShiftGame = new Game();
});
