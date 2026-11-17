/**
 * ============================================================================
 * ЛАБОРАТОРНА РОБОТА №9: АДАПТИВНІ ФОРМИ ЗВОРОТНОГО ЗВ'ЯЗКУ ТА КЛІЄНТСЬКА ВАЛІДАЦІЯ
 * Проєкт: Портал кіберспортивної академії «КіберЛьвів» (Cyber-Athletic HUD)
 * Виконав: ст. гр. ПП-24 Іванців Максим Богданович
 * Модуль: assets/js/validation.js (Vanilla JavaScript ES6+ без сторонніх бібліотек)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. КОНСТАНТИ З РЕГУЛЯРНИМИ ВИРАЗАМИ (RegEx) ТА НАЛАШТУВАННЯ ВАЛІДАЦІЇ (Етап 6–7)
// ----------------------------------------------------------------------------

/**
 * Регулярний вираз для перевірки імені гравця / замовника:
 * - ^ та $ фіксують початок і кінець рядка;
 * - дозволяє українські (включно з Ґ, Є, І, Ї) та латинські літери, апостроф, дефіс і пробіли;
 * - блокує цифри, спецсимволи та HTML-теги.
 */
const REGEX_NAME = /^[a-zA-Zа-яА-ЯґҐєЄіІїЇ'’-]+(?:\s+[a-zA-Zа-яА-ЯґҐєЄіІїЇ'’-]+)*$/;

/**
 * Класичний регулярний вираз для перевірки електронної пошти (Етап 7):
 * - ^[a-zA-Z0-9._%+-]+ — локальна частина до символу @ (мінімум 1 дозволений символ);
 * - @ — обов'язковий символ «собачки»;
 * - [a-zA-Z0-9.-]+ — ім'я поштового домену (наприклад, gmail, ukr, lpnu);
 * - \. — екранована граматична крапка перед доменною зоною;
 * - [a-zA-Z]{2,}$ — доменна зона верхнього рівня (TLD) мінімум із 2 літер (.ua, .com, .tech).
 */
const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Регулярний вираз для суворої перевірки українського номера телефону (Етап 7, 10):
 * - ^ — початок рядка;
 * - \+380 — обов'язковий міжнародний код України зі знаком плюс (екранований \+);
 * - \d{9} — рівно 9 цифр після коду +380 (код оператора та номер абонента);
 * - $ — кінець рядка (пробіли, дужки, дефіси чи літери не допускаються).
 */
const REGEX_PHONE = /^\+380\d{9}$/;

/**
 * Допоміжний регулярний вираз для виявлення спроб вставки HTML-тегів (XSS-гігієна у повідомленні)
 */
const REGEX_HTML_TAGS = /<[^>]*>/;

// Ліміти довжини текстових полів (Edge Cases)
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 500;

// Множина полів, з якими користувач уже взаємодіяв (для динамічної валідації Етапу 9)
const touchedFields = new Set();

// Збереження останнього сфокусованого елемента перед відкриттям модального вікна (a11y)
let lastFocusedElement = null;
let isSubmitting = false;

// ----------------------------------------------------------------------------
// 2. ФУНКЦІЇ КЕРУВАННЯ UI-СТАНАМИ ПОЛІВ: NORMAL / FOCUS / ERROR / SUCCESS (Етап 5, 8)
// ----------------------------------------------------------------------------

/**
 * Відображає стан помилки (Error State) для поля форми:
 * - додає червону рамку border-red-500;
 * - встановлює атрибут доступності aria-invalid="true";
 * - показує текстове повідомлення про помилку під полем та іконку помилки.
 */
function showError(inputElement, errorElement, message) {
  if (!inputElement || !errorElement) return;

  inputElement.classList.remove('border-green-500', 'border-cyber-border', 'border-gray-300');
  inputElement.classList.add('border-red-500');
  inputElement.setAttribute('aria-invalid', 'true');

  const errorTextSpan = errorElement.querySelector('.error-text');
  if (errorTextSpan) {
    errorTextSpan.textContent = message;
  } else {
    errorElement.textContent = message;
  }
  errorElement.classList.remove('hidden');

  // Оновлення статусних іконок всередині поля (якщо передбачені в контейнері)
  updateFieldStateIcons(inputElement.id, 'error');
}

/**
 * Відображає успішний стан (Success State) для поля форми:
 * - додає зелену рамку border-green-500;
 * - встановлює атрибут доступності aria-invalid="false";
 * - приховує текст помилки та показує зелену іконку підтвердження.
 */
function showSuccess(inputElement, errorElement) {
  if (!inputElement || !errorElement) return;

  inputElement.classList.remove('border-red-500', 'border-cyber-border', 'border-gray-300');
  inputElement.classList.add('border-green-500');
  inputElement.setAttribute('aria-invalid', 'false');

  const errorTextSpan = errorElement.querySelector('.error-text');
  if (errorTextSpan) {
    errorTextSpan.textContent = '';
  } else {
    errorElement.textContent = '';
  }
  errorElement.classList.add('hidden');

  updateFieldStateIcons(inputElement.id, 'success');
}

/**
 * Скидає поле до початкового нейтрального стану (Normal State)
 */
function clearError(inputElement, errorElement) {
  if (!inputElement || !errorElement) return;

  inputElement.classList.remove('border-red-500', 'border-green-500');
  inputElement.classList.add('border-cyber-border');
  inputElement.setAttribute('aria-invalid', 'false');

  const errorTextSpan = errorElement.querySelector('.error-text');
  if (errorTextSpan) {
    errorTextSpan.textContent = '';
  } else {
    errorElement.textContent = '';
  }
  errorElement.classList.add('hidden');

  updateFieldStateIcons(inputElement.id, 'normal');
}

/**
 * Перемикає іконки станів (помилка / успіх) праворуч усередині поля введення
 */
function updateFieldStateIcons(fieldId, state) {
  const errorIcon = document.getElementById(`${fieldId}IconError`);
  const successIcon = document.getElementById(`${fieldId}IconSuccess`);

  if (errorIcon) {
    errorIcon.classList.toggle('hidden', state !== 'error');
  }
  if (successIcon) {
    successIcon.classList.toggle('hidden', state !== 'success');
  }
}

// ----------------------------------------------------------------------------
// 3. ОКРЕМІ МІКРО-ФУНКЦІЇ ВАЛІДАЦІЇ КОЖНОГО ПОЛЯ ФОРМИ (Етап 8)
// ----------------------------------------------------------------------------

/**
 * Перевірка поля «Ім'я» (#username):
 * - обов'язкове, після trim() не менше 2 і не більше 50 символів;
 * - лише літери (укр/лат), апостроф, дефіс або пробіл між словами.
 */
function validateName() {
  const nameInput = document.getElementById('username');
  const nameError = document.getElementById('nameError');
  if (!nameInput || !nameError) return false;

  const value = nameInput.value.trim();

  if (value.length === 0) {
    showError(nameInput, nameError, "Поле «Ім'я» є обов'язковим для заповнення.");
    return false;
  }

  if (value.length < MIN_NAME_LENGTH) {
    showError(nameInput, nameError, `Ім'я повинно містити не менше ${MIN_NAME_LENGTH} символів.`);
    return false;
  }

  if (value.length > MAX_NAME_LENGTH) {
    showError(nameInput, nameError, `Ім'я не може перевищувати ${MAX_NAME_LENGTH} символів.`);
    return false;
  }

  if (!REGEX_NAME.test(value)) {
    showError(nameInput, nameError, "Ім'я може містити лише українські або латинські літери, дефіс чи апостроф (без цифр і спецсимволів).");
    return false;
  }

  showSuccess(nameInput, nameError);
  return true;
}

/**
 * Перевірка поля «Електронна пошта» (#email) за шаблоном REGEX_EMAIL
 */
function validateEmail() {
  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  if (!emailInput || !emailError) return false;

  const value = emailInput.value.trim();

  if (value.length === 0) {
    showError(emailInput, emailError, "Поле «Електронна пошта» є обов'язковим для заповнення.");
    return false;
  }

  if (!REGEX_EMAIL.test(value)) {
    showError(emailInput, emailError, "Введіть коректну електронну адресу (наприклад: gamer.2026@domain.ua).");
    return false;
  }

  showSuccess(emailInput, emailError);
  return true;
}

/**
 * Допоміжна UX-функція для аналізу граничних випадків (Edge Cases) номера телефону (Етап 10).
 * Якщо користувач ввів локальний номер з 0 (наприклад, 0501234567) або скопіював номер із
 * пробілами/дужками/дефісами (+380 (50) 123-45-67), повертає відформатований варіант +380XXXXXXXXX.
 */
function suggestNormalizedPhone(rawPhone) {
  // Вилучаємо пробіли, дужки та дефіси, залишаючи лише +, цифри та літери
  const compact = rawPhone.replace(/[\s()-]/g, '');

  // Якщо в номері є літери — автокорекцію не пропонуємо
  if (/[a-zA-Zа-яА-ЯґҐєЄіІїЇ]/.test(compact)) {
    return null;
  }

  // Випадок 1: Користувач почав вводити з 0 (наприклад, 0501234567 — 10 цифр)
  if (/^0\d{9}$/.test(compact)) {
    return '+38' + compact;
  }

  // Випадок 2: Користувач ввів 380XXXXXXXXX без знака + (12 цифр)
  if (/^380\d{9}$/.test(compact)) {
    return '+' + compact;
  }

  // Випадок 3: Користувач вставив номер із пробілами/дужками (+380 50 123 45 67)
  if (/^\+380\d{9}$/.test(compact) && compact !== rawPhone) {
    return compact;
  }

  return null;
}

/**
 * Перевірка поля «Номер телефону» (#phone) за суворим українським стандартом +380XXXXXXXXX
 * з детальними підказками для всіх Edge Cases (Етап 7, 10)
 */
function validatePhone() {
  const phoneInput = document.getElementById('phone');
  const phoneError = document.getElementById('phoneError');
  const normalizeBox = document.getElementById('phoneNormalizeBox');
  const normalizeBtn = document.getElementById('phoneNormalizeBtn');
  if (!phoneInput || !phoneError) return false;

  const rawValue = phoneInput.value;
  const trimmedValue = rawValue.trim();

  // Ховаємо блок UX-автопідстановки перед новою перевіркою
  if (normalizeBox) {
    normalizeBox.classList.add('hidden');
  }

  if (trimmedValue.length === 0) {
    showError(phoneInput, phoneError, "Поле «Номер телефону» є обов'язковим. Формат: +380XXXXXXXXX.");
    return false;
  }

  // Перевірка на наявність літер (Edge Case №6)
  if (/[a-zA-Zа-яА-ЯґҐєЄіІїЇ]/.test(trimmedValue)) {
    showError(phoneInput, phoneError, "Номер телефону не може містити літери. Дозволено лише +380 та 9 цифр.");
    return false;
  }

  // Перевірка на пробіли, дужки або дефіси (Edge Case №3, №4)
  if (/[\s()-]/.test(trimmedValue)) {
    const suggestion = suggestNormalizedPhone(trimmedValue);
    showError(phoneInput, phoneError, "Введіть номер без пробілів, дужок та дефісів у форматі +380XXXXXXXXX.");
    if (suggestion && normalizeBox && normalizeBtn) {
      normalizeBtn.dataset.suggested = suggestion;
      normalizeBtn.textContent = `Підставити ${suggestion}`;
      normalizeBox.classList.remove('hidden');
    }
    return false;
  }

  // Перевірка, чи починається номер із 0 замість +380 (Edge Case №1)
  if (trimmedValue.startsWith('0') || trimmedValue.startsWith('380')) {
    const suggestion = suggestNormalizedPhone(trimmedValue);
    showError(phoneInput, phoneError, "Номер має починатися з міжнародного префікса +380 (наприклад: +380501234567).");
    if (suggestion && normalizeBox && normalizeBtn) {
      normalizeBtn.dataset.suggested = suggestion;
      normalizeBtn.textContent = `Перетворити на ${suggestion}`;
      normalizeBox.classList.remove('hidden');
    }
    return false;
  }

  // Перевірка кількості цифр після +380 (Edge Case №5 — менше або більше 9 цифр)
  if (trimmedValue.startsWith('+380')) {
    const afterPrefix = trimmedValue.slice(4);
    if (/^\d+$/.test(afterPrefix) && afterPrefix.length < 9) {
      showError(phoneInput, phoneError, `Після +380 має бути рівно 9 цифр (зараз введено: ${afterPrefix.length}).`);
      return false;
    }
    if (/^\d+$/.test(afterPrefix) && afterPrefix.length > 9) {
      showError(phoneInput, phoneError, `Забагато цифр: після +380 допускається рівно 9 цифр (зараз: ${afterPrefix.length}).`);
      return false;
    }
  }

  // Фінальна сувора перевірка за регулярним виразом /^\+380\d{9}$/
  if (!REGEX_PHONE.test(trimmedValue)) {
    showError(phoneInput, phoneError, "Формат має бути строго українським: +380XXXXXXXXX (+380 та 9 цифр).");
    return false;
  }

  showSuccess(phoneInput, phoneError);
  return true;
}

/**
 * Перевірка поля вибору навчальної дисципліни / теми звернення (#topic)
 */
function validateTopic() {
  const topicSelect = document.getElementById('topic');
  const topicError = document.getElementById('topicError');
  if (!topicSelect || !topicError) return true;

  if (!topicSelect.value || topicSelect.value.trim() === '') {
    showError(topicSelect, topicError, "Будь ласка, оберіть дисципліну або тему звернення зі списку.");
    return false;
  }

  showSuccess(topicSelect, topicError);
  return true;
}

/**
 * Перевірка поля «Текст повідомлення» (#message):
 * - обов'язкове, мінімум 10 символів (після trim), максимум 500 символів;
 * - не повинно містити ін'єкцій HTML-тегів (<script>, <img> тощо).
 */
function validateMessage() {
  const messageInput = document.getElementById('message');
  const messageError = document.getElementById('messageError');
  const charCounter = document.getElementById('messageCounter');
  if (!messageInput || !messageError) return false;

  const value = messageInput.value.trim();

  // Оновлення лічильника символів у реальному часі
  if (charCounter) {
    charCounter.textContent = `${value.length} / ${MAX_MESSAGE_LENGTH} символів`;
    charCounter.classList.toggle('text-cyber-cyan', value.length >= MIN_MESSAGE_LENGTH && value.length <= MAX_MESSAGE_LENGTH);
    charCounter.classList.toggle('text-red-400', value.length > MAX_MESSAGE_LENGTH);
  }

  if (value.length === 0) {
    showError(messageInput, messageError, "Поле «Повідомлення» не може бути порожнім (мінімум 10 символів).");
    return false;
  }

  if (REGEX_HTML_TAGS.test(value)) {
    showError(messageInput, messageError, "З міркувань безпеки введення HTML-тегів (<...>) у повідомленні заборонено.");
    return false;
  }

  if (value.length < MIN_MESSAGE_LENGTH) {
    showError(messageInput, messageError, `Повідомлення занадто коротке: введіть щонайменше ${MIN_MESSAGE_LENGTH} символів (зараз: ${value.length}).`);
    return false;
  }

  if (value.length > MAX_MESSAGE_LENGTH) {
    showError(messageInput, messageError, `Перевищено ліміт довжини повідомлення (максимум ${MAX_MESSAGE_LENGTH} символів).`);
    return false;
  }

  showSuccess(messageInput, messageError);
  return true;
}

/**
 * Перевірка чекбокса згоди з політикою конфіденційності (#agreement)
 */
function validateAgreement() {
  const agreementInput = document.getElementById('agreement');
  const agreementError = document.getElementById('agreementError');
  if (!agreementInput || !agreementError) return false;

  if (!agreementInput.checked) {
    showError(agreementInput, agreementError, "Для надсилання форми необхідно надати згоду з політикою конфіденційності.");
    return false;
  }

  showSuccess(agreementInput, agreementError);
  return true;
}

// ----------------------------------------------------------------------------
// 4. КЕРУВАННЯ МОДАЛЬНИМ ВІКНОМ УСПІШНОГО НАДСИЛАННЯ (Етап 11, 12)
// ----------------------------------------------------------------------------

/**
 * Відкриває доступне модальне вікно успішного проходження клієнтської валідації
 */
function openSuccessModal(submittedData) {
  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const summaryName = document.getElementById('modalSummaryName');
  const summaryEmail = document.getElementById('modalSummaryEmail');
  const summaryPhone = document.getElementById('modalSummaryPhone');
  const summaryTopic = document.getElementById('modalSummaryTopic');

  if (!successModal) return;

  // Заповнюємо зведення перевірених даних у модальному вікні
  if (summaryName) summaryName.textContent = submittedData.name;
  if (summaryEmail) summaryEmail.textContent = submittedData.email;
  if (summaryPhone) summaryPhone.textContent = submittedData.phone;
  if (summaryTopic) summaryTopic.textContent = submittedData.topicLabel;

  // Зберігаємо елемент, з якого було викликано відкриття, для повернення фокусу після закриття
  lastFocusedElement = document.activeElement;

  successModal.classList.remove('hidden');
  successModal.classList.add('flex');
  successModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');

  // Переводимо клавіатурний фокус на кнопку «Закрити» всередині модального вікна (WCAG 2.2)
  if (closeModalBtn) {
    setTimeout(() => closeModalBtn.focus(), 50);
  }
}

/**
 * Закриває модальне вікно та повертає клавіатурний фокус на форму
 */
function closeSuccessModal() {
  const successModal = document.getElementById('successModal');
  if (!successModal || successModal.classList.contains('hidden')) return;

  successModal.classList.remove('flex');
  successModal.classList.add('hidden');
  successModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('overflow-hidden');

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

/**
 * Повне скидання всіх UI-станів полів форми до початкових (Normal State) після form.reset()
 */
function resetFormUIState() {
  const fields = [
    { inputId: 'username', errorId: 'nameError' },
    { inputId: 'email', errorId: 'emailError' },
    { inputId: 'phone', errorId: 'phoneError' },
    { inputId: 'topic', errorId: 'topicError' },
    { inputId: 'message', errorId: 'messageError' },
    { inputId: 'agreement', errorId: 'agreementError' }
  ];

  fields.forEach(({ inputId, errorId }) => {
    const inputEl = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    clearError(inputEl, errorEl);
  });

  const normalizeBox = document.getElementById('phoneNormalizeBox');
  if (normalizeBox) normalizeBox.classList.add('hidden');

  const charCounter = document.getElementById('messageCounter');
  if (charCounter) {
    charCounter.textContent = `0 / ${MAX_MESSAGE_LENGTH} символів`;
    charCounter.classList.remove('text-cyber-cyan', 'text-red-400');
  }

  touchedFields.clear();
}

// ----------------------------------------------------------------------------
// 5. ІНІЦІАЛІЗАЦІЯ ДИНАМІЧНИХ СЛУХАЧІВ ПОДІЙ (input, blur, submit, keydown) (Етап 9–12)
// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('feedbackForm');
  if (!form) return;

  const nameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const topicSelect = document.getElementById('topic');
  const messageInput = document.getElementById('message');
  const agreementInput = document.getElementById('agreement');

  const normalizeBtn = document.getElementById('phoneNormalizeBtn');
  const normalizeBox = document.getElementById('phoneNormalizeBox');
  const resetFormBtn = document.getElementById('resetFormBtn');

  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const closeModalSecondaryBtn = document.getElementById('closeModalSecondaryBtn');

  // Конфігурація прив'язки полів до їхніх функцій валідації
  const fieldValidators = [
    { element: nameInput, validate: validateName },
    { element: emailInput, validate: validateEmail },
    { element: phoneInput, validate: validatePhone },
    { element: topicSelect, validate: validateTopic },
    { element: messageInput, validate: validateMessage }
  ];

  // Динамічна валідація (Етап 9):
  // - Помилки не показуються відразу після відкриття сторінки;
  // - blur виконує фінальну перевірку поля після того, як користувач його залишив;
  // - input оновлює стан у реальному часі після початку взаємодії.
  fieldValidators.forEach(({ element, validate }) => {
    if (!element) return;

    element.addEventListener('blur', () => {
      touchedFields.add(element.id);
      validate();
    });

    element.addEventListener('input', () => {
      // Для поля phone з автопідстановкою +380 не показуємо помилку, поки введено лише базовий префікс
      if (element.id === 'phone' && !touchedFields.has('phone') && element.value.trim() === '+380') {
        return;
      }
      // Якщо користувач уже взаємодіяв із полем або почав вводити текст — оновлюємо стан
      if (touchedFields.has(element.id) || element.value.trim().length > 0) {
        touchedFields.add(element.id);
        validate();
      }
    });
  });

  if (topicSelect) {
    topicSelect.addEventListener('change', () => {
      touchedFields.add(topicSelect.id);
      validateTopic();
    });
  }

  if (agreementInput) {
    agreementInput.addEventListener('change', () => {
      touchedFields.add(agreementInput.id);
      validateAgreement();
    });
  }

  // UX-функція (Етап 10): автоперетворення формату телефону за кліком на підказку
  if (normalizeBtn && phoneInput) {
    normalizeBtn.addEventListener('click', () => {
      const suggested = normalizeBtn.dataset.suggested;
      if (suggested) {
        phoneInput.value = suggested;
        if (normalizeBox) normalizeBox.classList.add('hidden');
        validatePhone();
        phoneInput.focus();
      }
    });
  }

  // Кнопка ручного очищення форми та скидання станів
  if (resetFormBtn) {
    resetFormBtn.addEventListener('click', () => {
      form.reset();
      resetFormUIState();
    });
  }

  // Перехоплення надсилання форми (Submit Event — Етап 8, 9, 11)
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // Запобігаємо перезавантаженню сторінки

    // Захист від подвійного швидкого натискання (Edge Case: Double Submit)
    if (isSubmitting) return;

    // Запускаємо тотальну перевірку всіх полів одночасно
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isTopicValid = validateTopic();
    const isMessageValid = validateMessage();
    const isAgreementValid = validateAgreement();

    // Позначаємо всі поля як «зачеплені», щоб користувач бачив миттєвий фідбек при виправленні
    ['username', 'email', 'phone', 'topic', 'message', 'agreement'].forEach((id) =>
      touchedFields.add(id)
    );

    // Якщо хоча б одне поле невалідне — блокуємо надсилання та переводимо фокус на перше поле з помилкою
    if (
      !isNameValid ||
      !isEmailValid ||
      !isPhoneValid ||
      !isTopicValid ||
      !isMessageValid ||
      !isAgreementValid
    ) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid && typeof firstInvalid.focus === 'function') {
        firstInvalid.focus();
      }
      return;
    }

    isSubmitting = true;

    // Збираємо валідні дані для відображення у модальному вікні
    const selectedTopicText =
      topicSelect && topicSelect.options[topicSelect.selectedIndex]
        ? topicSelect.options[topicSelect.selectedIndex].text
        : 'Загальне звернення';

    const submittedData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      topicLabel: selectedTopicText
    };

    // Очищуємо всі поля форми методом form.reset() та скидаємо зелені рамки (Етап 8, 11)
    form.reset();
    resetFormUIState();

    // Відкриваємо модальне вікно успішного завершення клієнтської валідації
    openSuccessModal(submittedData);

    setTimeout(() => {
      isSubmitting = false;
    }, 300);
  });

  // Закриття модального вікна кнопками
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSuccessModal);
  }
  if (closeModalSecondaryBtn) {
    closeModalSecondaryBtn.addEventListener('click', closeSuccessModal);
  }

  // Закриття модального вікна при кліку на затемнений оверлей (фон),
  // але НЕ при кліку всередині білої/темної картки з текстом (Контрольне питання №9)
  if (successModal) {
    successModal.addEventListener('click', (event) => {
      if (event.target === successModal) {
        closeSuccessModal();
      }
    });
  }

  // Клавіатурна навігація: закриття модального вікна клавішею Escape та утримання фокусу (Focus Trap)
  document.addEventListener('keydown', (event) => {
    if (!successModal || successModal.classList.contains('hidden')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeSuccessModal();
      return;
    }

    // Утримання фокусу (Tab / Shift + Tab) всередині відкритого модального вікна
    if (event.key === 'Tab') {
      const focusableElements = successModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
  });
});
