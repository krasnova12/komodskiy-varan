/* =========================================================
   Комодский варан — интерактив лендинга
   Без внешних библиотек.
   ========================================================= */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.getElementById("site-header");
  const burger = document.querySelector(".burger");
  const nav = document.getElementById("primary-nav");
  const scrollTopButton = document.querySelector(".scroll-top");

  /* ---------- Шапка: фиксированное состояние ---------- */

  const onScroll = () => {
    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 10);
    }
    if (scrollTopButton) {
      scrollTopButton.classList.toggle("is-visible", window.scrollY > 350);
    }
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (scrollTopButton) {
    scrollTopButton.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }

  /* ---------- Мобильное меню ---------- */

  const setMenu = (open) => {
    if (!header || !burger) return;
    header.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  };

  if (burger) {
    burger.addEventListener("click", () => {
      setMenu(!header.classList.contains("is-open"));
    });
  }

  if (nav) {
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  document.addEventListener("click", (event) => {
    if (!header || !header.classList.contains("is-open")) return;
    if (!header.contains(event.target)) setMenu(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100) setMenu(false);
  });

  /* ---------- Появление блоков при прокрутке ---------- */

  const revealItems = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ---------- Активный пункт меню ---------- */

  const navLinks = Array.from(document.querySelectorAll(".nav__link"));
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (navLinks.length && navSections.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
            link.classList.toggle("is-active", isCurrent);
            if (isCurrent) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );

    navSections.forEach((section) => sectionObserver.observe(section));
  }

  /* ---------- Форма записи ---------- */

  const form = document.getElementById("booking-form");
  const success = document.getElementById("form-success");
  const submitButton = document.getElementById("submit-btn");
  const submitLabel = submitButton ? submitButton.querySelector(".btn__label") : null;
  const resetButton = document.getElementById("form-reset");
  const nameField = document.getElementById("name");
  const phoneField = document.getElementById("phone");
  const serviceField = document.getElementById("service");
  const consentField = document.getElementById("consent");
  const carField = document.getElementById("car");
  const messageField = document.getElementById("message");
  const formError = document.getElementById("form-error");
  const formCard = document.getElementById("booking");

  // Telegram Bot API.
  // Внимание: токен в клиентском коде доступен любому посетителю сайта.
  // Для публичного проекта отправку лучше проксировать через сервер/CRM.
  const TELEGRAM_BOT_TOKEN = "9156919851:AAFDiBSgTIQ36fSphrEM0GtnfMTad96cSQc";
  const TELEGRAM_CHAT_ID = "5860535167";
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const TELEGRAM_TIMEOUT_MS = 15000;
  let isSending = false;

  const onlyDigits = (value) => value.replace(/\D/g, "");

  const formatPhone = (value) => {
    let digits = onlyDigits(value);

    if (!digits) return "";

    if (digits.startsWith("80")) {
      digits = "375" + digits.slice(2);
    } else if (!digits.startsWith("375")) {
      digits = "375" + digits;
    }

    digits = digits.slice(0, 12);
    const rest = digits.slice(3);

    let result = "+375";
    if (rest.length) result += " (" + rest.slice(0, 2);
    if (rest.length >= 3) result += ") " + rest.slice(2, 5);
    if (rest.length >= 6) result += "-" + rest.slice(5, 7);
    if (rest.length >= 8) result += "-" + rest.slice(7, 9);

    return result;
  };

  if (phoneField) {
    phoneField.addEventListener("input", () => {
      phoneField.value = formatPhone(phoneField.value);
      if (onlyDigits(phoneField.value).length === 12) setError("phone", "");
    });

    phoneField.addEventListener("blur", () => {
      if (phoneField.value && onlyDigits(phoneField.value).length < 12) {
        setError("phone", "Введите номер полностью: +375 (XX) XXX-XX-XX");
      }
    });
  }

  function setError(name, message) {
    const error = document.querySelector(`[data-error-for="${name}"]`);
    if (error) error.textContent = message || "";

    if (name === "consent") {
      const checkbox = consentField ? consentField.closest(".checkbox") : null;
      if (checkbox) checkbox.classList.toggle("is-invalid", Boolean(message));
      return;
    }

    const input = document.getElementById(name);
    const field = input ? input.closest(".field") : null;
    if (field) field.classList.toggle("is-invalid", Boolean(message));
    if (input) {
      if (message) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    }
  }

  const clearErrors = () => {
    ["name", "phone", "consent"].forEach((name) => setError(name, ""));
  };

  const validateForm = () => {
    clearErrors();

    let valid = true;
    let firstInvalid = null;

    if (!nameField || nameField.value.trim().length < 2) {
      setError("name", "Напишите, пожалуйста, как к вам обращаться");
      valid = false;
      firstInvalid = firstInvalid || nameField;
    }

    const phoneDigits = phoneField ? onlyDigits(phoneField.value) : "";
    if (phoneDigits.length !== 12) {
      setError("phone", "Введите номер полностью: +375 (XX) XXX-XX-XX");
      valid = false;
      firstInvalid = firstInvalid || phoneField;
    }

    if (!consentField || !consentField.checked) {
      setError("consent", "Нужно согласие на обработку данных, чтобы мы могли ответить");
      valid = false;
      firstInvalid = firstInvalid || consentField;
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: false });
    }

    return valid;
  };

  if (nameField) {
    nameField.addEventListener("input", () => {
      if (nameField.value.trim().length >= 2) setError("name", "");
    });
  }

  if (consentField) {
    consentField.addEventListener("change", () => {
      if (consentField.checked) setError("consent", "");
    });
  }

  const buildTelegramMessage = () => {
    const name = nameField ? nameField.value.trim() : "";
    const phone = phoneField ? phoneField.value.trim() : "";
    const car = carField && carField.value.trim() ? carField.value.trim() : "не указан";
    const service = serviceField && serviceField.value ? serviceField.value : "не указана";
    const comment = messageField && messageField.value.trim() ? messageField.value.trim() : "—";

    return [
      "🔥 Новая заявка с сайта!",
      "",
      `👤 Имя: ${name}`,
      `📞 Телефон: ${phone}`,
      `🚗 Автомобиль: ${car}`,
      `🛠 Услуга: ${service}`,
      `💬 Комментарий: ${comment}`,
    ].join("\n");
  };

  const showFormError = (visible) => {
    if (!formError) return;
    formError.hidden = !visible;
    if (visible) {
      formError.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    }
  };

  const setSubmitting = (sending) => {
    if (submitButton) {
      submitButton.disabled = sending;
      submitButton.classList.toggle("is-loading", sending);
      submitButton.setAttribute("aria-busy", String(sending));
    }
    if (submitLabel) {
      submitLabel.textContent = sending ? "Отправка..." : "Отправить заявку";
    }
  };

  const sendTelegramMessage = async (text) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

    try {
      const response = await fetch(TELEGRAM_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          disable_notification: false,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.ok !== true) {
        const description = data && data.description ? data.description : `HTTP ${response.status}`;
        throw new Error(`Telegram API: ${description}`);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSending) return;

      showFormError(false);
      if (!validateForm()) return;

      isSending = true;
      setSubmitting(true);

      try {
        const message = buildTelegramMessage();
        const safeMessage = message.length > 4000 ? `${message.slice(0, 3999)}…` : message;
        await sendTelegramMessage(safeMessage);

        form.hidden = true;
        form.reset();
        clearErrors();
        setSubmitting(false);

        if (success) {
          success.hidden = false;
          const heading = success.querySelector("h3");
          if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
          }
          success.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
        }
      } catch (error) {
        console.error("Не удалось отправить заявку в Telegram:", error);
        setSubmitting(false);
        showFormError(true);
      } finally {
        isSending = false;
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (success) success.hidden = true;
      if (form) {
        form.hidden = false;
        form.reset();
        clearErrors();
        showFormError(false);
        setSubmitting(false);
        if (phoneField) phoneField.value = "";
        if (nameField) nameField.focus({ preventScroll: true });
        if (formCard) {
          formCard.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
        }
      }
    });
  }

  /* ---------- Предвыбор услуги из карточки ---------- */

  const serviceLinks = document.querySelectorAll("[data-service]");

  serviceLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (!serviceField) return;

      const requested = link.dataset.service;
      const option = Array.from(serviceField.options).find((item) => item.value === requested);

      if (option) {
        serviceField.value = requested;
        serviceField.classList.add("is-prefilled");
        window.setTimeout(() => serviceField.classList.remove("is-prefilled"), 1500);
      }

      if (form && form.hidden) {
        form.hidden = false;
        if (success) success.hidden = true;
      }
    });
  });

  /* ---------- Плавающая кнопка звонка: не мешает форме ---------- */

  const callFab = document.querySelector(".call-fab");
  const bookingCard = document.getElementById("booking");

  if (callFab && bookingCard && "IntersectionObserver" in window) {
    const fabObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          callFab.classList.toggle("is-hidden", entry.isIntersecting);
        });
      },
      { threshold: 0.18 }
    );

    fabObserver.observe(bookingCard);
  }

  /* ---------- Год в подвале ---------- */

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
