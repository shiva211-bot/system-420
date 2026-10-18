"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { Volume2, VolumeX } from "lucide-react";
import { DEFAULT_LOCK_CONFIG, type IntroPhase, type LockConfig } from "./types";
import { soundEngine } from "./soundEngine";
import { createMechanicalWheelField, WHEEL_FIELD_CONFIGS, type WheelFieldInstance } from "./MechanicalWheelField";
import { createTriangularModule, type ModuleInstance, type LetterType } from "./MechanicalModules";
import { createCentralProcessor } from "./CentralProcessor";
import { createParticleVortex } from "./ParticleVortex";
import { createMechanicalDoors } from "./MechanicalDoors";
import { createDiamondFrame } from "./DiamondFrame";

interface LockIntroSceneProps {
  onComplete: () => void;
  config?: LockConfig;
}

export function LockIntroScene({ onComplete, config = DEFAULT_LOCK_CONFIG }: LockIntroSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<IntroPhase>("loading");
  const [activeModule, setActiveModule] = useState("Initializing");
  const [isMuted, setIsMuted] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const masterTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const finished = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (masterTimelineRef.current) masterTimelineRef.current.kill();
    soundEngine.setMuted(true);
    setPhase("completed");
    try {
      localStorage.setItem("lockIntroCompleted", "true");
    } catch {
      /* ignore */
    }
    onCompleteRef.current();
  }, []);

  const handleToggleAudio = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040608);
    scene.fog = new THREE.FogExp2(0x040608, 0.022);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.4);
    keyLight.position.set(6, 8, 12);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-8, -6, 8);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x06b6d4, 4.5, 25);
    rimLight.position.set(0, 0, 4);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0x1e293b, 0.9));

    const diamondFrame = createDiamondFrame();
    scene.add(diamondFrame.group);
    const mechanicalDoors = createMechanicalDoors();
    scene.add(mechanicalDoors.group);
    const wheelFields: WheelFieldInstance[] = [];
    WHEEL_FIELD_CONFIGS.forEach((cfg) => {
      const wf = createMechanicalWheelField(cfg.id);
      wf.group.position.copy(cfg.position);
      wf.group.rotation.z = cfg.rotationZ;
      scene.add(wf.group);
      wheelFields.push(wf);
    });
    const processor = createCentralProcessor(config);
    scene.add(processor.group);
    const letters: LetterType[] = ["L", "O", "C", "K"];
    const modules: ModuleInstance[] = letters.map((letter, idx) => {
      const mod = createTriangularModule(letter, idx);
      scene.add(mod.group);
      return mod;
    });
    const particleVortex = createParticleVortex(4800);
    scene.add(particleVortex.group);

    const clock = new THREE.Clock();
    const speedMult = 1;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      wheelFields.forEach((wf) => wf.update(delta, speedMult));
      particleVortex.update(delta);
      renderer.render(scene, camera);
    };
    animate();

    const masterTimeline = gsap.timeline({
      onComplete: () => {
        try {
          localStorage.setItem("lockIntroCompleted", "true");
        } catch {
          /* ignore */
        }
        setPhase("completed");
        window.setTimeout(() => finish(), 900);
      },
    });
    masterTimelineRef.current = masterTimeline;

    const animState = {
      modL: 0,
      modO: 0,
      modC: 0,
      modK: 0,
      dialAngle: 0,
      unfold: 0,
      processorOpacity: 1,
      disintegration: 0,
      vortex: 0,
      doors: 0,
      camZ: 18,
    };

    masterTimeline.to({}, {
      duration: 0.5,
      onStart: () => {
        setPhase("loading");
        setActiveModule("Lock Grid Initialized");
      },
    });
    masterTimeline.to(animState, {
      camZ: 15.2,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => {
        camera.position.z = animState.camZ;
      },
    }, 0.2);

    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => setPhase("assembly"),
    });

    const dock = (key: "modL" | "modO" | "modC" | "modK", index: number, label: string) => {
      masterTimeline.to(animState, {
        [key]: 1,
        duration: 0.85,
        ease: "power2.inOut",
        onStart: () => {
          setActiveModule(label);
          soundEngine.playServoSlide(0.85);
        },
        onUpdate: () => {
          modules[index].setTravelProgress(animState[key]);
        },
        onComplete: () => {
          modules[index].setDocked(true);
          soundEngine.playDockingClank();
          if (index === 3) {
            processor.setSocketClamped(true);
            setActiveModule("L-O-C-K Assembly Unified");
          }
        },
      });
    };
    dock("modL", 0, "Docking Module L");
    dock("modO", 1, "Docking Module O");
    dock("modC", 2, "Docking Module C");
    dock("modK", 3, "Docking Module K");
    masterTimeline.to({}, { duration: 0.4 });

    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => {
        setPhase("lock_rotation");
        setActiveModule(`Lock Combination Sequence (n=${config.n})`);
      },
    });
    masterTimeline.to(animState, {
      camZ: 13.5,
      duration: 1,
      ease: "power1.out",
      onUpdate: () => {
        camera.position.z = animState.camZ;
      },
    });

    const turn1Rad = -Math.PI * 2 * config.step1Turns;
    masterTimeline.to(animState, {
      dialAngle: turn1Rad,
      duration: config.rotationDuration,
      ease: "power1.inOut",
      onStart: () => {
        setActiveModule(`Combination Step 1: Right x ${config.n}`);
        for (let t = 0; t < 12; t++) window.setTimeout(() => soundEngine.playDialClick(1200 + t * 40), t * 90);
      },
      onUpdate: () => processor.setDialAngle(animState.dialAngle),
    });
    const turn2Rad = turn1Rad + Math.PI * 2 * (config.step2Turns || 1.25);
    masterTimeline.to(animState, {
      dialAngle: turn2Rad,
      duration: config.rotationDuration * 0.9,
      ease: "power1.inOut",
      onStart: () => {
        setActiveModule("Combination Step 2: Left x (n-3)");
        for (let t = 0; t < 8; t++) window.setTimeout(() => soundEngine.playDialClick(1400 - t * 50), t * 110);
      },
      onUpdate: () => processor.setDialAngle(animState.dialAngle),
    });
    const turn3Rad = turn2Rad - Math.PI * 2 * (config.step3Turns || 1);
    masterTimeline.to(animState, {
      dialAngle: turn3Rad,
      duration: config.rotationDuration * 0.85,
      ease: "power2.out",
      onStart: () => {
        setActiveModule("Combination Step 3: Right x (n-2)");
        for (let t = 0; t < 6; t++) window.setTimeout(() => soundEngine.playDialClick(1500 + t * 60), t * 120);
      },
      onUpdate: () => processor.setDialAngle(animState.dialAngle),
      onComplete: () => {
        processor.setLockUnlocked(true);
        soundEngine.playLockRelease();
        setActiveModule("Vault Tumbler Disengaged: UNLOCKED");
      },
    });
    masterTimeline.to({}, { duration: 0.6 });

    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => {
        setPhase("lock_unfolding");
        setActiveModule("Mechanical Assembly Unfolding");
        soundEngine.playUnfold();
      },
    });
    masterTimeline.to(animState, {
      unfold: 1,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => processor.setUnfoldProgress(animState.unfold),
    });
    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => {
        setPhase("disintegration");
        setActiveModule("Digital Disintegration Active");
        soundEngine.playDisintegration();
      },
    });
    masterTimeline.to(animState, {
      processorOpacity: 0,
      disintegration: 1,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        processor.setAssemblyOpacity(animState.processorOpacity);
        particleVortex.setDisintegrationProgress(animState.disintegration);
      },
    });
    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => {
        setPhase("vortex");
        setActiveModule("Gravitational Singularity Vortex");
        soundEngine.playVortexRumble();
      },
    });
    masterTimeline.to(animState, {
      camZ: 17.5,
      duration: 2.2,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.position.z = animState.camZ;
      },
    }, "<");
    masterTimeline.to(animState, {
      vortex: 1,
      duration: 2.2,
      ease: "power3.in",
      onUpdate: () => particleVortex.setVortexProgress(animState.vortex),
      onComplete: () => {
        particleVortex.setVoidActive(true);
        processor.group.visible = false;
        setActiveModule("Vortex Consumed // Event Horizon Sealed");
      },
    });
    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => {
        setPhase("doors_opening");
        setActiveModule("Blast Chambers Disengaging");
        soundEngine.playDoorsOpening();
      },
    });
    masterTimeline.to(animState, {
      doors: 1,
      duration: 1.4,
      ease: "power3.out",
      onUpdate: () => mechanicalDoors.setDoorOpenProgress(animState.doors),
    });
    masterTimeline.to({}, {
      duration: 0.1,
      onStart: () => {
        setPhase("welcome_reveal");
        setActiveModule("Chamber Cleared");
        setShowWelcome(true);
        soundEngine.playWelcomeChime();
      },
    });
    masterTimeline.to({}, { duration: 1.6 });

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (masterTimelineRef.current) masterTimelineRef.current.kill();
      diamondFrame.dispose();
      mechanicalDoors.dispose();
      processor.dispose();
      particleVortex.dispose();
      modules.forEach((m) => m.dispose());
      wheelFields.forEach((wf) => wf.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
    };
  }, [config.n, config.rotationDuration, config.step1Turns, config.step2Turns, config.step3Turns, finish]);

  return (
    <div className="relative h-full min-h-screen w-full select-none overflow-hidden bg-black">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex flex-col items-center gap-2 text-center">
        <p className="font-display text-xs tracking-[0.4em] text-cyan">{phase.replace(/_/g, " ").toUpperCase()}</p>
        <p className="font-mono text-[11px] tracking-[0.28em] text-white/70">{activeModule}</p>
      </div>
      {showWelcome ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center font-display text-4xl text-white md:text-6xl">
          WELCOME OPERATOR
        </p>
      ) : null}
      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        <button
          type="button"
          onClick={handleToggleAudio}
          className="hud-btn min-h-[44px] min-w-[44px] rounded-sm px-3 text-xs"
          aria-label={isMuted ? "Unmute intro" : "Mute intro"}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={finish} className="hud-btn min-h-[44px] min-w-[44px] rounded-sm px-4 text-xs">
          SKIP
        </button>
      </div>
    </div>
  );
}
