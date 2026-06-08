document.addEventListener("DOMContentLoaded", () => {
    // Initial DOM cache
    const buttons = {
        stagger: document.getElementById("btn-stagger"),
        ease: document.getElementById("btn-ease"),
        threeD: document.getElementById("btn-3d"),
        reset: document.getElementById("btn-reset")
    };

    const views = {
        stagger: document.getElementById("view-stagger"),
        ease: document.getElementById("view-ease"),
        threeD: document.getElementById("view-3d")
    };

    const details = {
        stagger: document.getElementById("detail-stagger"),
        ease: document.getElementById("detail-ease"),
        threeD: document.getElementById("detail-3d")
    };

    let activeTab = "stagger";
    let activeEase = "power4.out";
    let easeTween = null;
    let carouselTween = null;

    // ----------------------------------------
    // 1. Snappy Hover Interactions on Buttons
    // ----------------------------------------
    Object.entries(buttons).forEach(([key, btn]) => {
        if (!btn) return;
        
        btn.addEventListener("mouseenter", () => {
            if (btn.classList.contains("active")) return;
            gsap.to(btn, {
                scale: 1.03,
                borderColor: key === "reset" ? "hsl(320, 100%, 50%)" : "hsl(190, 100%, 50%)",
                boxShadow: key === "reset" 
                    ? "0 0 10px rgba(255, 0, 127, 0.15)" 
                    : "0 0 10px rgba(0, 242, 254, 0.15)",
                duration: 0.25,
                ease: "power2.out"
            });
        });

        btn.addEventListener("mouseleave", () => {
            if (btn.classList.contains("active")) return;
            gsap.to(btn, {
                scale: 1,
                borderColor: key === "reset" ? "rgba(255, 0, 127, 0.25)" : "rgba(255, 255, 255, 0.08)",
                boxShadow: "none",
                duration: 0.25,
                ease: "power2.out"
            });
        });
    });

    // ----------------------------------------
    // 2. Performance-safe Tab Transitions
    // ----------------------------------------
    function switchTab(newTab) {
        if (newTab === activeTab) return;

        // Update button states
        Object.values(buttons).forEach(btn => btn.classList.remove("active"));
        buttons[newTab].classList.add("active");

        const oldView = views[activeTab];
        const oldDetail = details[activeTab];
        
        // Reset old hover scaling
        gsap.set(buttons[newTab], { scale: 1, boxShadow: "none" });

        const tl = gsap.timeline({
            onComplete: () => {
                // Toggle display
                gsap.set([oldView, oldDetail], { display: "none" });
                gsap.set([views[newTab], details[newTab]], { display: "flex" });
                
                // Snappy fade & slide in
                gsap.fromTo(views[newTab], 
                    { autoAlpha: 0, scale: 0.96, y: 12 },
                    { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" }
                );
                gsap.fromTo(details[newTab], 
                    { autoAlpha: 0, x: -15 },
                    { autoAlpha: 1, x: 0, duration: 0.3, ease: "power2.out" }
                );

                activeTab = newTab;
                initScreenAnimations();
            }
        });

        tl.to(oldView, { autoAlpha: 0, scale: 0.98, y: -8, duration: 0.25, ease: "power2.in" })
          .to(oldDetail, { autoAlpha: 0, x: 15, duration: 0.2, ease: "power2.in" }, "-=0.2");
    }

    buttons.stagger.addEventListener("click", () => switchTab("stagger"));
    buttons.ease.addEventListener("click", () => switchTab("ease"));
    buttons.threeD.addEventListener("click", () => switchTab("threeD"));
    buttons.reset.addEventListener("click", () => resetAll());

    // ----------------------------------------
    // 3. Optimized Memory Matrix (Stagger)
    // ----------------------------------------
    function runStaggerStorm() {
        gsap.killTweensOf(".grid-node");
        
        // Setup initial properties (prevents layout flash)
        gsap.set(".grid-node", { scale: 1, rotation: 0, autoAlpha: 1, background: "rgba(255, 255, 255, 0.02)" });
        
        gsap.fromTo(".grid-node", 
            { 
                scale: 0.4, 
                rotation: -45,
                autoAlpha: 0
            }, 
            { 
                scale: 1, 
                rotation: 0,
                autoAlpha: 1,
                duration: 0.8,
                ease: "back.out(1.4)",
                stagger: {
                    grid: [4, 4],
                    from: "center",
                    amount: 0.5
                }
            }
        );
    }

    // Node click effect (individual micro-animation)
    const nodes = document.querySelectorAll(".grid-node");
    nodes.forEach(node => {
        node.addEventListener("click", () => {
            gsap.fromTo(node, 
                { scale: 0.85, background: "rgba(0, 242, 254, 0.2)", borderColor: "var(--primary)" },
                { scale: 1, background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255,255,255,0.06)", duration: 0.4, ease: "power2.out" }
            );
        });
    });

    // ----------------------------------------
    // 4. Hormone Decay Monitor (Ease Explorer)
    // ----------------------------------------
    const easeOpts = document.querySelectorAll(".ease-opt");
    easeOpts.forEach(opt => {
        opt.addEventListener("click", () => {
            easeOpts.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            activeEase = opt.getAttribute("data-ease");
            runEaseExplorer();
        });
    });

    function runEaseExplorer() {
        if (easeTween) easeTween.kill();
        
        const ball = document.querySelector(".decay-ball");
        const indicator = document.getElementById("curve-indicator");
        const levelText = document.getElementById("hormone-level");
        
        // Reset positions
        gsap.set(ball, { x: 0 });
        gsap.set(indicator, { cx: 50, cy: 20 });
        levelText.textContent = "1.00";

        // Width of track is 100%, minus ball diameter (28px).
        // Let's use relative percentage animation or a fixed layout value.
        // The display canvas width on desktop is ~600px, 80% is 480px.
        const track = document.querySelector(".decay-track");
        const maxTravel = track.clientWidth - 28;

        const path = document.getElementById("curve-path");
        const pathLength = path.getTotalLength();

        easeTween = gsap.fromTo(ball, 
            { x: 0 },
            { 
                x: maxTravel,
                duration: 2.5,
                ease: activeEase,
                repeat: -1,
                yoyo: true,
                onUpdate: function() {
                    const progress = this.progress();
                    
                    // Update text indicator (from 1.00 down to 0.00)
                    const val = (1 - progress).toFixed(2);
                    levelText.textContent = val;

                    // Update indicator ball on SVG path
                    const point = path.getPointAtLength(progress * pathLength);
                    
                    gsap.set(indicator, {
                        cx: point.x,
                        cy: point.y
                    });
                }
            }
        );
    }

    // ----------------------------------------
    // 5. 3D Hologram Carousel (3D Matrix)
    // ----------------------------------------
    function run3DCarousel() {
        if (carouselTween) carouselTween.kill();
        
        const container = document.querySelector(".carousel-container");
        const cards = document.querySelectorAll(".carousel-card");
        
        // Setup card 3D arrangements (120deg apart, orbit radius via transformOrigin)
        gsap.set(cards, { transformOrigin: "50% 50% -160px" });
        gsap.set(cards[0], { rotationY: 0, z: 0 });
        gsap.set(cards[1], { rotationY: 120, z: 0 });
        gsap.set(cards[2], { rotationY: 240, z: 0 });
        
        gsap.set(container, { z: -80 }); // Push back to avoid clipping
        
        // Snappy, GPU-accelerated container rotation
        carouselTween = gsap.to(container, {
            rotationY: "+=360",
            duration: 12,
            ease: "none",
            repeat: -1
        });

        // 3D Tilt Interaction on mouse move optimized with quickTo
        let rotateXTo = gsap.quickTo(container, "rotationX", { duration: 0.4, ease: "power2.out" });

        container.onmousemove = (e) => {
            const rect = container.getBoundingClientRect();
            const y = e.clientY - rect.top - rect.height / 2;
            rotateXTo(-y * 0.12);
        };

        container.onmouseleave = () => {
            rotateXTo(0);
        };
    }

    // ----------------------------------------
    // 6. Master Init & Reset
    // ----------------------------------------
    function initScreenAnimations() {
        if (activeTab !== "ease" && easeTween) {
            easeTween.kill();
        }
        if (activeTab !== "threeD" && carouselTween) {
            carouselTween.kill();
        }

        if (activeTab === "stagger") {
            runStaggerStorm();
        } else if (activeTab === "ease") {
            runEaseExplorer();
        } else if (activeTab === "threeD") {
            run3DCarousel();
        }
    }

    function resetAll() {
        initScreenAnimations();
        
        // Trigger a premium flash feedback on display canvas
        const canvas = document.querySelector(".display-canvas");
        gsap.fromTo(canvas, 
            { borderColor: "var(--primary)", boxShadow: "0 0 25px var(--glow-primary)" },
            { borderColor: "var(--border-color)", boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)", duration: 0.6, ease: "power2.out" }
        );
    }

    // ----------------------------------------
    // 7. MatchMedia (Accessibility / Responsiveness)
    // ----------------------------------------
    const mm = gsap.matchMedia();
    
    mm.add({
        isMobile: "(max-width: 799px)",
        reduceMotion: "(prefers-reduced-motion: reduce)"
    }, (context) => {
        const { reduceMotion } = context.conditions;

        if (reduceMotion) {
            if (easeTween) easeTween.pause();
            if (carouselTween) carouselTween.pause();
            
            gsap.killTweensOf(".grid-node");
            gsap.set(".grid-node", { scale: 1, rotation: 0, autoAlpha: 1 });
        }
    });

    // Start
    gsap.set([views.ease, views.threeD, details.ease, details.threeD], { display: "none" });
    initScreenAnimations();
});
