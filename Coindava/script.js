/**
 * KlyroX — front-end interactions
 * No external dependencies. No backend calls — the waitlist form and
 * SmartSpend simulation are both illustrative front-end behavior only.
 */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ------------------------------------------------------------------ */
  /* Navbar: glass background on scroll                                  */
  /* ------------------------------------------------------------------ */
  function initNavbarScroll() {
    var navbar = document.getElementById("navbar");
    if (!navbar) return;

    var setState = function () {
      var scrolled = window.scrollY > 12;
      navbar.setAttribute("data-scrolled", String(scrolled));
    };

    setState();
    window.addEventListener("scroll", setState, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile menu toggle                                                   */
  /* ------------------------------------------------------------------ */
  function initMobileMenu() {
    var navbar = document.getElementById("navbar");
    var toggle = document.getElementById("navToggle");
    var menu = document.getElementById("mobileMenu");
    if (!navbar || !toggle || !menu) return;

    var close = function () {
      navbar.setAttribute("data-menu-open", "false");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    };

    var open = function () {
      navbar.setAttribute("data-menu-open", "true");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    };

    toggle.addEventListener("click", function () {
      var isOpen = navbar.getAttribute("data-menu-open") === "true";
      if (isOpen) {
        close();
      } else {
        open();
      }
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal for [data-reveal] elements                            */
  /* ------------------------------------------------------------------ */
  function initScrollReveal() {
    var targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Number count-up for the portfolio balances                          */
  /* ------------------------------------------------------------------ */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (Number.isNaN(target)) return;

    var isWhole = target >= 100;
    var decimals = isWhole ? 2 : 2;

    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return;
    }

    var duration = 900;
    var start = null;

    var step = function (timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = target * eased;
      el.textContent = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------ */
  /* SmartSpend simulation state machine                                  */
  /* idle -> analyzing -> decided                                         */
  /* ------------------------------------------------------------------ */
  function initSmartSpendSimulation() {
    var dashboard = document.getElementById("dashboard");
    var statusText = document.getElementById("analysisStatusText");
    var replayButton = document.getElementById("replaySim");
    if (!dashboard) return;

    var counts = dashboard.querySelectorAll("[data-count]");
    var hasRun = false;
    var timers = [];

    var clearTimers = function () {
      timers.forEach(window.clearTimeout);
      timers = [];
    };

    var run = function () {
      clearTimers();
      dashboard.setAttribute("data-state", "idle");
      if (statusText) statusText.textContent = "Analyzing available assets…";

      counts.forEach(animateCount);

      var toAnalyzing = window.setTimeout(
        function () {
          dashboard.setAttribute("data-state", "analyzing");
        },
        prefersReducedMotion ? 0 : 500
      );

      var toDecided = window.setTimeout(
        function () {
          dashboard.setAttribute("data-state", "decided");
          if (statusText) statusText.textContent = "Analysis complete.";
        },
        prefersReducedMotion ? 50 : 2100
      );

      timers.push(toAnalyzing, toDecided);
    };

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !hasRun) {
              hasRun = true;
              run();
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      observer.observe(dashboard);
    } else {
      run();
    }

    if (replayButton) {
      replayButton.addEventListener("click", run);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Decision breakdown modal ("View decision")                          */
  /* ------------------------------------------------------------------ */
  function initDecisionModal() {
    var trigger = document.getElementById("viewDecisionBtn");
    var modal = document.getElementById("decisionModal");
    var closeBtn = document.getElementById("decisionModalClose");
    if (!trigger || !modal) return;

    var supportsDialog =
      typeof modal.showModal === "function" && typeof modal.close === "function";

    var open = function () {
      if (supportsDialog) {
        modal.showModal();
      } else {
        modal.setAttribute("open", "");
      }
    };

    var close = function () {
      if (supportsDialog) {
        modal.close();
      } else {
        modal.removeAttribute("open");
      }
      trigger.focus();
    };

    trigger.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);

    // Click on the backdrop (native <dialog> only) closes the modal.
    modal.addEventListener("click", function (event) {
      if (event.target === modal) close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Waitlist form                                                        */
  /* Front-end only: no request is sent anywhere. Wire this up to a real  */
  /* email/list provider before shipping.                                 */
  /* ------------------------------------------------------------------ */
  function initWaitlistForm() {
    var form = document.getElementById("waitlistForm");
    var successMessage = document.getElementById("waitlistSuccess");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = form.querySelector("#waitlistEmail");
      if (!input || !input.checkValidity()) {
        if (input) input.focus();
        return;
      }

      form.querySelector(".waitlist-field-row").style.display = "none";
      if (successMessage) {
        successMessage.setAttribute("data-state", "visible");
      }
      form.querySelector(".form-note").style.display = "none";
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                  */
  /* ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initNavbarScroll();
    initMobileMenu();
    initScrollReveal();
    initSmartSpendSimulation();
    initDecisionModal();
    initWaitlistForm();
  });
})();
