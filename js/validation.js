// Contact form validation for Task 2. This is intentionally vanilla JS so it can be reused before backend integration.
const contactForm = document.querySelector("#contactForm");
const successMessage = document.querySelector("#successMessage");

const validators = {
  fullName(value) {
    return value.trim() ? "" : "Full name cannot be empty.";
  },
  email(value) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim()) ? "" : "Enter a valid email address.";
  },
  phone(value) {
    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly.length === 10 ? "" : "Phone number must contain exactly 10 digits.";
  },
  subject(value) {
    return value ? "" : "Please select a subject.";
  },
  message(value) {
    return value.trim() ? "" : "Message cannot be empty.";
  },
};

function setFieldError(field, message) {
  const errorElement = document.querySelector(`#${field.id}Error`);
  field.classList.toggle("invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function validateField(field) {
  const validate = validators[field.name];

  if (!validate) {
    return true;
  }

  const error = validate(field.value);
  setFieldError(field, error);
  return !error;
}

contactForm?.addEventListener("input", (event) => {
  const field = event.target;

  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    validateField(field);
  }
});

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const fields = Array.from(contactForm.querySelectorAll("input, textarea, select"));
  const validationResults = fields.map((field) => validateField(field));
  const isValid = validationResults.every(Boolean);

  if (!isValid) {
    successMessage.textContent = "";
    return;
  }

  successMessage.textContent = "Thank you! Your message has been validated and is ready to send.";
  contactForm.reset();
  fields.forEach((field) => {
    field.classList.remove("invalid");
    field.removeAttribute("aria-invalid");
  });
});
