/**
 * models.js - Low-Poly 3D Station, Vehicles, Character, and Props
 * Built procedurally with Three.js primitives for maximum performance and portability.
 */

class StationBuilder {
  constructor(scene) {
    this.scene = scene;
    this.materials = this.initMaterials();
  }

  initMaterials() {
    return {
      asphalt: new THREE.MeshLambertMaterial({ color: 0x24272e }),
      concrete: new THREE.MeshLambertMaterial({ color: 0xd4d8df }),
      curb: new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }),
      yellowRoad: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
      whiteRoad: new THREE.MeshBasicMaterial({ color: 0xf8fafc }),
      canopyRoof: new THREE.MeshLambertMaterial({ color: 0x0f172a }),
      canopyFascia: new THREE.MeshLambertMaterial({ color: 0x0284c7 }),
      canopyGlow: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 }),
      darkMetal: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 }),
      pumpWhite: new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }),
      pumpBlue: new THREE.MeshLambertMaterial({ color: 0x0284c7 }),
      pumpScreen: new THREE.MeshBasicMaterial({ color: 0x0c4a6e }),
      screenText: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      regularNozzle: new THREE.MeshLambertMaterial({ color: 0x38bdf8 }),
      premiumNozzle: new THREE.MeshLambertMaterial({ color: 0xa855f7 }),
      dieselNozzle: new THREE.MeshLambertMaterial({ color: 0x22c55e }),
      rubberHose: new THREE.MeshLambertMaterial({ color: 0x111827 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.45, roughness: 0.1 }),
      shopWall: new THREE.MeshLambertMaterial({ color: 0x1e293b }),
      shopRoof: new THREE.MeshLambertMaterial({ color: 0x0f172a }),
      shopInterior: new THREE.MeshLambertMaterial({ color: 0x334155 }),
      warmLight: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      signGlow: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      treeTrunk: new THREE.MeshLambertMaterial({ color: 0x78350f }),
      foliageLight: new THREE.MeshLambertMaterial({ color: 0x4ade80, flatShading: true }),
      foliageDark: new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true }),
      bollardYellow: new THREE.MeshLambertMaterial({ color: 0xfacc15 }),
      bollardBlack: new THREE.MeshLambertMaterial({ color: 0x1e293b }),
      barrelRed: new THREE.MeshLambertMaterial({ color: 0xef4444 }),
      barrelBlue: new THREE.MeshLambertMaterial({ color: 0x3b82f6 })
    };
  }

  // Build the complete station environment
  buildStation() {
    const stationGroup = new THREE.Group();

    // 1. Ground & Road Markings
    const groundGeo = new THREE.PlaneGeometry(60, 50);
    const ground = new THREE.Mesh(groundGeo, this.materials.asphalt);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    stationGroup.add(ground);

    // Entry road markings (Yellow dashed center lines, arrows)
    this.addRoadMarkings(stationGroup);

    // 2. Central Raised Pump Island
    const islandGeo = new THREE.BoxGeometry(4.5, 0.35, 14);
    const island = new THREE.Mesh(islandGeo, this.materials.concrete);
    island.position.set(0, 0.175, 0);
    island.receiveShadow = true;
    stationGroup.add(island);

    // Island curbs
    const curbGeo = new THREE.BoxGeometry(4.7, 0.25, 14.2);
    const curb = new THREE.Mesh(curbGeo, this.materials.curb);
    curb.position.set(0, 0.12, 0);
    stationGroup.add(curb);

    // 3. Canopy Pillars (4 pillars)
    const pillarPositions = [
      [-1.8, 0, -5],
      [1.8, 0, -5],
      [-1.8, 0, 5],
      [1.8, 0, 5]
    ];
    pillarPositions.forEach(pos => {
      const pillarGeo = new THREE.CylinderGeometry(0.22, 0.22, 5.2, 12);
      const pillar = new THREE.Mesh(pillarGeo, this.materials.steel);
      pillar.position.set(pos[0], 2.6, pos[2]);
      pillar.castShadow = true;
      stationGroup.add(pillar);

      // Base collar
      const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.4, 12);
      const base = new THREE.Mesh(baseGeo, this.materials.darkMetal);
      base.position.set(pos[0], 0.35, pos[2]);
      stationGroup.add(base);
    });

    // 4. Canopy Roof & Glowing Fascia
    const roofGeo = new THREE.BoxGeometry(13, 0.7, 20);
    const roof = new THREE.Mesh(roofGeo, this.materials.canopyRoof);
    roof.position.set(0, 5.4, 0);
    roof.castShadow = true;
    stationGroup.add(roof);

    // Neon Fascia edge rim
    const rimGeo = new THREE.BoxGeometry(13.3, 0.3, 20.3);
    const rim = new THREE.Mesh(rimGeo, this.materials.canopyFascia);
    rim.position.set(0, 5.25, 0);
    stationGroup.add(rim);

    // Neon accent stripes
    const neonGeo = new THREE.BoxGeometry(13.4, 0.08, 20.4);
    const neon = new THREE.Mesh(neonGeo, this.materials.canopyGlow);
    neon.position.set(0, 5.25, 0);
    stationGroup.add(neon);

    // Canopy Underlights (Recessed ceiling lights)
    const underlightPositions = [
      [0, 5.0, -4],
      [0, 5.0, 0],
      [0, 5.0, 4]
    ];
    underlightPositions.forEach(p => {
      const lightMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16),
        this.materials.warmLight
      );
      lightMesh.position.set(p[0], p[1], p[2]);
      stationGroup.add(lightMesh);
    });

    // 5. Fuel Pump Dispensers (2 units on island)
    this.pump1 = this.createPumpDispenser(0, 0.35, -2);
    this.pump2 = this.createPumpDispenser(0, 0.35, 2);
    stationGroup.add(this.pump1.group);
    stationGroup.add(this.pump2.group);

    // 6. Station Shop / Office in background
    const shop = this.createStationShop(-18, 0, 0);
    stationGroup.add(shop);

    // 7. Price Billboard Totem (near road entrance)
    this.totem = this.createPriceTotem(12, 0, -14);
    stationGroup.add(this.totem.group);

    // 8. Decorative Props (Bollards, Drums, Trees)
    this.addProps(stationGroup);

    // 9. 3D Finish Point Beacon (at shop computer desk)
    this.finishMarker = this.createFinishPointMarker(-14.5, 0, 0);
    stationGroup.add(this.finishMarker.group);

    this.scene.add(stationGroup);
    return {
      stationGroup,
      pumps: [this.pump1, this.pump2],
      totem: this.totem,
      finishMarker: this.finishMarker
    };
  }

  addRoadMarkings(parent) {
    const markGroup = new THREE.Group();

    // Service lane box around pump area (yellow boundary)
    const boxGeo = new THREE.PlaneGeometry(8, 16);
    const boxLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
    );
    boxLine.rotation.x = -Math.PI / 2;
    boxLine.position.set(0, 0.015, 0);
    markGroup.add(boxLine);

    // Queue entry lane dashes (cars enter from Z = 22 down to Z = 0)
    for (let z = 6; z <= 24; z += 3.5) {
      const dashGeo = new THREE.PlaneGeometry(0.3, 1.8);
      const dash = new THREE.Mesh(dashGeo, this.materials.whiteRoad);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      markGroup.add(dash);
    }

    // "PUMP #1" Service stop mark
    const stopGeo = new THREE.PlaneGeometry(3.5, 0.4);
    const stopLine = new THREE.Mesh(stopGeo, this.materials.yellowRoad);
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.02, 0);
    markGroup.add(stopLine);

    // Exit arrows (cars exit toward Z = -25)
    for (let z = -5; z >= -22; z -= 5) {
      const arrowGeo = new THREE.PlaneGeometry(0.35, 2.5);
      const arrow = new THREE.Mesh(arrowGeo, this.materials.yellowRoad);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(0, 0.02, z);
      markGroup.add(arrow);
    }

    parent.add(markGroup);
  }

  createPumpDispenser(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Dispenser Housing
    const bodyGeo = new THREE.BoxGeometry(1.2, 2.2, 1.6);
    const body = new THREE.Mesh(bodyGeo, this.materials.pumpWhite);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    // Brand accent top
    const capGeo = new THREE.BoxGeometry(1.24, 0.4, 1.64);
    const cap = new THREE.Mesh(capGeo, this.materials.pumpBlue);
    cap.position.y = 2.15;
    group.add(cap);

    // Digital Screen
    const screenGeo = new THREE.BoxGeometry(0.05, 0.6, 0.9);
    const screen = new THREE.Mesh(screenGeo, this.materials.pumpScreen);
    screen.position.set(0.61, 1.3, 0);
    group.add(screen);

    // Fuel Nozzles on side (3 colors: Regular, Premium, Diesel)
    const nozzleTypes = [
      { mat: this.materials.regularNozzle, zOff: -0.4, label: 'REG' },
      { mat: this.materials.premiumNozzle, zOff: 0.0, label: 'PREM' },
      { mat: this.materials.dieselNozzle,  zOff: 0.4, label: 'DSL' }
    ];

    const nozzles = [];
    nozzleTypes.forEach(nt => {
      const holGeo = new THREE.BoxGeometry(0.15, 0.35, 0.18);
      const holster = new THREE.Mesh(holGeo, this.materials.darkMetal);
      holster.position.set(0.62, 0.8, nt.zOff);
      group.add(holster);

      const nozGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.35, 8);
      const noz = new THREE.Mesh(nozGeo, nt.mat);
      noz.rotation.z = Math.PI / 4;
      noz.position.set(0.68, 0.9, nt.zOff);
      group.add(noz);
      nozzles.push({ mesh: noz, type: nt.label });
    });

    // Flexible rubber hose mesh
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.62, 0.7, 0),
      new THREE.Vector3(0.9, 0.25, 0.2),
      new THREE.Vector3(0.7, 0.1, 0.4)
    ]);
    const hoseGeo = new THREE.TubeGeometry(hoseCurve, 12, 0.035, 6, false);
    const hose = new THREE.Mesh(hoseGeo, this.materials.rubberHose);
    group.add(hose);

    return { group, nozzles, hose, position: new THREE.Vector3(x, y, z) };
  }

  createStationShop(x, y, z) {
    const shopGroup = new THREE.Group();
    shopGroup.position.set(x, y, z);

    // Main building body
    const buildingGeo = new THREE.BoxGeometry(10, 4.5, 18);
    const building = new THREE.Mesh(buildingGeo, this.materials.shopWall);
    building.position.y = 2.25;
    building.castShadow = true;
    shopGroup.add(building);

    // Overhang roof
    const roofGeo = new THREE.BoxGeometry(11, 0.5, 19);
    const roof = new THREE.Mesh(roofGeo, this.materials.shopRoof);
    roof.position.y = 4.6;
    shopGroup.add(roof);

    // Glass shopfront facing the pumps
    const glassGeo = new THREE.PlaneGeometry(12, 3.2);
    const glass = new THREE.Mesh(glassGeo, this.materials.glass);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(5.02, 2.0, 0);
    shopGroup.add(glass);

    // Interior warm glow light
    const interiorLight = new THREE.PointLight(0xfef08a, 1.2, 14);
    interiorLight.position.set(0, 3.2, 0);
    shopGroup.add(interiorLight);

    // Shop sign "EXPRESS MART & OFFICE"
    const signGeo = new THREE.BoxGeometry(0.3, 0.9, 8);
    const sign = new THREE.Mesh(signGeo, this.materials.canopyFascia);
    sign.position.set(5.15, 4.0, 0);
    shopGroup.add(sign);

    const signTextGeo = new THREE.BoxGeometry(0.32, 0.2, 7.5);
    const signText = new THREE.Mesh(signTextGeo, this.materials.canopyGlow);
    signText.position.set(5.15, 4.0, 0);
    shopGroup.add(signText);

    // Terminal desk near window
    const deskGeo = new THREE.BoxGeometry(2.5, 1.1, 1.4);
    const desk = new THREE.Mesh(deskGeo, this.materials.steel);
    desk.position.set(3.5, 0.55, 0);
    shopGroup.add(desk);

    // Computer monitor on desk
    const monGeo = new THREE.BoxGeometry(0.1, 0.6, 0.8);
    const mon = new THREE.Mesh(monGeo, this.materials.pumpScreen);
    mon.position.set(3.4, 1.35, 0);
    shopGroup.add(mon);

    return shopGroup;
  }

  createFinishPointMarker(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.visible = false; // Hidden until 10 cars completed

    // 1. Pulsing inner floor ring
    const ringGeo = new THREE.RingGeometry(0.7, 1.1, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const innerRing = new THREE.Mesh(ringGeo, ringMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.04;
    group.add(innerRing);

    // 2. Expanding outer wave ring
    const waveGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const outerRing = new THREE.Mesh(waveGeo, waveMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.05;
    group.add(outerRing);

    // 3. Vertical translucent glowing energy pillar
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.45, 4.2, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 2.1;
    group.add(beam);

    // 4. Floating Rotating Finish Checkpoint Diamond
    const diamondGeo = new THREE.OctahedronGeometry(0.38, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
      metalness: 0.8,
      roughness: 0.2
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 2.4;
    group.add(diamond);

    // 5. Checkered Finish Flag Icon atop diamond
    const flagGeo = new THREE.BoxGeometry(0.55, 0.35, 0.04);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.y = 2.9;
    group.add(flag);

    // 6. Point light
    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 9);
    pointLight.position.y = 1.8;
    group.add(pointLight);

    let time = 0;
    return {
      group,
      setVisible: (vis) => {
        group.visible = vis;
      },
      update: (delta) => {
        if (!group.visible) return;
        time += delta;
        diamond.rotation.y += delta * 1.8;
        diamond.position.y = 2.4 + Math.sin(time * 3.5) * 0.15;
        flag.rotation.y += delta * 1.8;
        flag.position.y = 2.9 + Math.sin(time * 3.5) * 0.15;
        beam.rotation.y -= delta * 0.5;

        // Pulse rings
        const scale = 1.0 + Math.sin(time * 4) * 0.18;
        innerRing.scale.set(scale, scale, 1);
        const waveScale = 1.0 + ((time * 0.8) % 1.0) * 0.5;
        outerRing.scale.set(waveScale, waveScale, 1);
        outerRing.material.opacity = Math.max(0.1, 0.7 - ((time * 0.8) % 1.0) * 0.6);
      }
    };
  }

  createPriceTotem(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Main tower column
    const colGeo = new THREE.BoxGeometry(1.6, 7.5, 2.8);
    const col = new THREE.Mesh(colGeo, this.materials.shopRoof);
    col.position.y = 3.75;
    col.castShadow = true;
    group.add(col);

    // Header sign "PUMP SHIFT"
    const headGeo = new THREE.BoxGeometry(1.7, 1.4, 2.9);
    const head = new THREE.Mesh(headGeo, this.materials.canopyFascia);
    head.position.y = 7.0;
    group.add(head);

    // 3 LED price slots
    const slots = [
      { y: 5.5, color: 0x38bdf8, name: 'REG' },
      { y: 4.3, color: 0xc084fc, name: 'PREM' },
      { y: 3.1, color: 0x4ade80, name: 'DSL' }
    ];

    slots.forEach(s => {
      const plateGeo = new THREE.BoxGeometry(1.75, 0.8, 2.4);
      const plate = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
      plate.position.y = s.y;
      group.add(plate);

      // Digital number glow strip
      const stripGeo = new THREE.BoxGeometry(1.8, 0.35, 1.9);
      const strip = new THREE.Mesh(stripGeo, new THREE.MeshBasicMaterial({ color: s.color }));
      strip.position.y = s.y;
      group.add(strip);
    });

    return { group, updatePrices: () => {} };
  }

  addProps(parent) {
    const propsGroup = new THREE.Group();

    // Safety bollards on island ends
    const bollardPositions = [
      [-1.8, 0, -6.5],
      [1.8, 0, -6.5],
      [-1.8, 0, 6.5],
      [1.8, 0, 6.5]
    ];
    bollardPositions.forEach(pos => {
      const bolGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 10);
      const bol = new THREE.Mesh(bolGeo, this.materials.bollardYellow);
      bol.position.set(pos[0], 0.5, pos[2]);
      propsGroup.add(bol);

      // Black stripes
      const strGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.2, 10);
      const str = new THREE.Mesh(strGeo, this.materials.bollardBlack);
      str.position.set(pos[0], 0.65, pos[2]);
      propsGroup.add(str);
    });

    // Oil drums stack
    const drumPositions = [
      [-10, 0, 8, this.materials.barrelRed],
      [-9.3, 0, 8.2, this.materials.barrelBlue],
      [-9.6, 0.9, 8.1, this.materials.barrelRed],
      [-10, 0, -8, this.materials.barrelBlue]
    ];
    drumPositions.forEach(d => {
      const drumGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 12);
      const drum = new THREE.Mesh(drumGeo, d[3]);
      drum.position.set(d[0], d[1] + 0.45, d[2]);
      drum.castShadow = true;
      propsGroup.add(drum);
    });

    // Trees along perimeter
    const treePositions = [
      [22, 0, -18],
      [24, 0, -8],
      [23, 0, 6],
      [22, 0, 18],
      [-26, 0, -18],
      [-26, 0, 18]
    ];
    treePositions.forEach(tp => {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.2, 8);
      const trunk = new THREE.Mesh(trunkGeo, this.materials.treeTrunk);
      trunk.position.set(tp[0], 1.1, tp[2]);
      trunk.castShadow = true;
      propsGroup.add(trunk);

      // Low poly leafy cones
      const f1Geo = new THREE.ConeGeometry(2.4, 3.2, 6);
      const f1 = new THREE.Mesh(f1Geo, this.materials.foliageDark);
      f1.position.set(tp[0], 3.2, tp[2]);
      f1.castShadow = true;
      propsGroup.add(f1);

      const f2Geo = new THREE.ConeGeometry(1.8, 2.5, 6);
      const f2 = new THREE.Mesh(f2Geo, this.materials.foliageLight);
      f2.position.set(tp[0], 4.6, tp[2]);
      f2.castShadow = true;
      propsGroup.add(f2);
    });

    parent.add(propsGroup);
  }
}

// ==========================================
// CAR BUILDER (Low-Poly Stylized Vehicles)
// ==========================================
class CarBuilder {
  static carPalette = [
    { name: 'Cherry Red', hex: 0xef4444, css: '#ef4444' },
    { name: 'Electric Blue', hex: 0x3b82f6, css: '#3b82f6' },
    { name: 'Sunflower Yellow', hex: 0xf59e0b, css: '#f59e0b' },
    { name: 'Emerald Green', hex: 0x10b981, css: '#10b981' },
    { name: 'Tangerine Orange', hex: 0xf97316, css: '#f97316' },
    { name: 'Midnight Charcoal', hex: 0x334155, css: '#334155' },
    { name: 'Pearl White', hex: 0xf8fafc, css: '#f8fafc' },
    { name: 'Violet Royale', hex: 0x8b5cf6, css: '#8b5cf6' }
  ];

  static carTypes = ['sedan', 'suv', 'sports', 'hatchback', 'truck'];

  static createCar(type = 'sedan', colorHex = 0xef4444) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.35,
      metalness: 0.25,
      flatShading: true
    });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6, roughness: 0.1 });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.2 });
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    let bodyLength = 4.2;
    let bodyWidth = 1.9;
    let bodyHeight = 0.9;
    let cabinLength = 2.4;
    let cabinHeight = 0.8;
    let cabinZOffset = 0.1;

    if (type === 'suv') {
      bodyLength = 4.4;
      bodyHeight = 1.1;
      cabinLength = 2.8;
      cabinHeight = 1.0;
      cabinZOffset = 0.2;
    } else if (type === 'sports') {
      bodyLength = 4.3;
      bodyWidth = 2.0;
      bodyHeight = 0.75;
      cabinLength = 1.9;
      cabinHeight = 0.65;
      cabinZOffset = -0.1;
    } else if (type === 'hatchback') {
      bodyLength = 3.6;
      bodyHeight = 0.95;
      cabinLength = 2.1;
      cabinHeight = 0.85;
      cabinZOffset = 0.3;
    } else if (type === 'truck') {
      bodyLength = 4.6;
      bodyHeight = 1.05;
      cabinLength = 1.8;
      cabinHeight = 1.0;
      cabinZOffset = 0.8;
    }

    // 1. Lower Chassis / Main Body
    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55 + bodyHeight / 2;
    body.castShadow = true;
    group.add(body);

    // 2. Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(bodyWidth * 0.86, cabinHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, body.position.y + bodyHeight / 2 + cabinHeight / 2, cabinZOffset);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof plate
    const roofGeo = new THREE.BoxGeometry(bodyWidth * 0.84, 0.12, cabinLength);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, cabin.position.y + cabinHeight / 2 + 0.06, cabinZOffset);
    group.add(roof);

    // 3. Wheels (4 wheels with rims)
    const wheelRadius = 0.38;
    const wheelWidth = 0.28;
    const wheelPositions = [
      [-bodyWidth / 2 - 0.05, wheelRadius, bodyLength * 0.3],
      [ bodyWidth / 2 + 0.05, wheelRadius, bodyLength * 0.3],
      [-bodyWidth / 2 - 0.05, wheelRadius, -bodyLength * 0.3],
      [ bodyWidth / 2 + 0.05, wheelRadius, -bodyLength * 0.3]
    ];

    const wheels = [];
    wheelPositions.forEach(wp => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wp[0], wp[1], wp[2]);

      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 14);
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, wheelWidth + 0.02, 8);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      group.add(wheelGroup);
      wheels.push(wheelGroup);
    });

    // 4. Headlights (facing front Z < 0)
    const head1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headLightMat);
    head1.position.set(-bodyWidth * 0.35, body.position.y, -bodyLength / 2 - 0.02);
    group.add(head1);

    const head2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headLightMat);
    head2.position.set(bodyWidth * 0.35, body.position.y, -bodyLength / 2 - 0.02);
    group.add(head2);

    // 5. Taillights (facing rear Z > 0)
    const tail1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), tailLightMat);
    tail1.position.set(-bodyWidth * 0.35, body.position.y, bodyLength / 2 + 0.02);
    group.add(tail1);

    const tail2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), tailLightMat);
    tail2.position.set(bodyWidth * 0.35, body.position.y, bodyLength / 2 + 0.02);
    group.add(tail2);

    // 6. Fuel Cap Indicator on right side (facing pump island at X = 0)
    const fuelCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    const fuelCap = new THREE.Mesh(fuelCapGeo, darkMat);
    fuelCap.rotation.z = Math.PI / 2;
    fuelCap.position.set(bodyWidth / 2 + 0.02, body.position.y + 0.1, 0.7);
    group.add(fuelCap);

    // 7. Fuel Cap TARGET RING — Glowing circle the player must aim at to fill fuel
    const targetRingOuter = new THREE.RingGeometry(0.20, 0.32, 24);
    const targetRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const targetRing = new THREE.Mesh(targetRingOuter, targetRingMat);
    targetRing.rotation.y = Math.PI / 2; // Face right (toward player/pump side +X)
    targetRing.position.set(bodyWidth / 2 + 0.04, body.position.y + 0.1, 0.7);
    group.add(targetRing);

    // Inner filled circle for raycasting hitbox
    const capHitGeo = new THREE.CircleGeometry(0.36, 16);
    const capHitMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15
    });
    const capHitMesh = new THREE.Mesh(capHitGeo, capHitMat);
    capHitMesh.rotation.y = Math.PI / 2;
    capHitMesh.position.set(bodyWidth / 2 + 0.05, body.position.y + 0.1, 0.7);
    capHitMesh.userData.isFuelCap = true;
    group.add(capHitMesh);

    // Fuel Port Anchor Vector (for hose attachment)
    const fuelPortWorld = new THREE.Vector3(bodyWidth / 2 + 0.05, body.position.y + 0.1, 0.7);

    return {
      group,
      wheels,
      fuelPortOffset: fuelPortWorld,
      fuelCapTarget: targetRing,   // animated ring
      fuelCapHitMesh: capHitMesh,  // raycasting target
      type,
      colorHex
    };
  }
}

// ==========================================
// ATTENDANT CHARACTER (Low-Poly Worker)
// ==========================================
class AttendantCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.speed = 7.0;
    this.isWalking = false;
    this.walkCycle = 0;
    this.buildCharacter();
    this.scene.add(this.group);
    this.group.position.set(1.5, 0, 0); // Start next to pump
  }

  buildCharacter() {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd1b3 });
    const suitMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Bright blue overall
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const capMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });  // Safety orange cap

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), darkMat);
    this.leftLeg.position.set(-0.16, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), darkMat);
    this.rightLeg.position.set(0.16, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // Torso / Jacket
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.4), suitMat);
    this.torso.position.set(0, 1.05, 0);
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // High-vis reflective sash
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.12, 0.42), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    sash.position.set(0, 1.05, 0);
    this.group.add(sash);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
    this.head.position.set(0, 1.62, 0);
    this.head.castShadow = true;
    this.group.add(this.head);

    // Cap / Visor
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46), capMat);
    cap.position.set(0, 1.83, 0);
    this.group.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.26), capMat);
    visor.position.set(0, 1.77, -0.32);
    this.group.add(visor);

    // Arms
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), suitMat);
    this.leftArm.position.set(-0.42, 1.05, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), suitMat);
    this.rightArm.position.set(0.42, 1.05, 0);
    this.group.add(this.rightArm);

    // Nozzle in hand (visible when holding fuel nozzle)
    this.heldNozzle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.35), new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
    this.heldNozzle.position.set(0.42, 0.75, -0.2);
    this.heldNozzle.visible = false;
    this.group.add(this.heldNozzle);

    // Interaction aura ring on ground
    const ringGeo = new THREE.RingGeometry(0.8, 0.95, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    this.aura = new THREE.Mesh(ringGeo, ringMat);
    this.aura.rotation.x = -Math.PI / 2;
    this.aura.position.y = 0.03;
    this.group.add(this.aura);
  }

  update(delta, moveDir) {
    // Movement
    if (moveDir.lengthSq() > 0.001) {
      this.isWalking = true;
      moveDir.normalize();

      this.group.position.x += moveDir.x * this.speed * delta;
      this.group.position.z += moveDir.z * this.speed * delta;

      // Keep within station bounds
      this.group.position.x = Math.max(-12, Math.min(10, this.group.position.x));
      this.group.position.z = Math.max(-14, Math.min(18, this.group.position.z));

      // Face direction of movement smoothly
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.group.rotation.y = targetAngle;

      // Walking leg animation
      this.walkCycle += delta * 12;
      this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.6;
      this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.6;
      this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.5;
      this.rightArm.rotation.x = Math.sin(this.walkCycle) * 0.5;
      this.torso.position.y = 1.05 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.04;
    } else {
      this.isWalking = false;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.torso.position.y = 1.05;
    }

    // Aura pulse
    if (this.aura) {
      this.aura.material.opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
    }
  }

  setHoldingNozzle(isHolding, colorHex = 0x38bdf8) {
    this.heldNozzle.visible = isHolding;
    if (isHolding) {
      this.heldNozzle.material.color.setHex(colorHex);
      this.rightArm.rotation.x = -Math.PI / 3;
    } else {
      this.rightArm.rotation.x = 0;
    }
  }

  setFirstPerson(isFP) {
    // Hide upper body from blocking first person camera view
    this.torso.visible = !isFP;
    this.head.visible = !isFP;
    this.leftArm.visible = !isFP;
    this.rightArm.visible = !isFP;
    this.heldNozzle.visible = !isFP && this.heldNozzle.visible;
  }

  // Create First-Person Viewmodel (Hands & held nozzle in front of camera)
  static createFPViewmodel() {
    const group = new THREE.Group();

    // Right Arm / Safety Glove
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.8 });
    const rubberMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const nozzleMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });

    // Forearm
    const armGeo = new THREE.BoxGeometry(0.09, 0.1, 0.42);
    const arm = new THREE.Mesh(armGeo, sleeveMat);
    arm.position.set(0.24, -0.22, -0.32);
    arm.rotation.x = 0.2;
    arm.rotation.y = -0.15;
    group.add(arm);

    // Glove / Hand
    const gloveGeo = new THREE.BoxGeometry(0.1, 0.11, 0.12);
    const glove = new THREE.Mesh(gloveGeo, gloveMat);
    glove.position.set(0.2, -0.18, -0.48);
    group.add(glove);

    // Nozzle Housing
    const nozBodyGeo = new THREE.BoxGeometry(0.08, 0.16, 0.24);
    const nozBody = new THREE.Mesh(nozBodyGeo, nozzleMat);
    nozBody.position.set(0.18, -0.14, -0.56);
    group.add(nozBody);

    // Metal Trigger Guard
    const guardGeo = new THREE.BoxGeometry(0.02, 0.12, 0.14);
    const guard = new THREE.Mesh(guardGeo, metalMat);
    guard.position.set(0.18, -0.22, -0.54);
    group.add(guard);

    // Metal Spout
    const spoutGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.32, 10);
    const spout = new THREE.Mesh(spoutGeo, metalMat);
    spout.rotation.x = -Math.PI / 3;
    spout.position.set(0.18, -0.06, -0.72);
    group.add(spout);

    // Viewmodel Hose segment
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, -0.24, -0.48),
      new THREE.Vector3(0.22, -0.45, -0.4),
      new THREE.Vector3(0.25, -0.65, -0.2)
    ]);
    const vHoseGeo = new THREE.TubeGeometry(hoseCurve, 10, 0.028, 6, false);
    const vHose = new THREE.Mesh(vHoseGeo, rubberMat);
    group.add(vHose);

    return {
      group,
      nozzleBody: nozBody,
      setNozzleColor: (hex) => {
        nozBody.material.color.setHex(hex);
      }
    };
  }
}

window.StationBuilder = StationBuilder;
window.CarBuilder = CarBuilder;
window.AttendantCharacter = AttendantCharacter;
