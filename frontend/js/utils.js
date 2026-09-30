export function isValidUrl(value) {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function clearElementText(element) {
  if (!element) return;
  element.innerText = "";
}

export function createSelectOptions(selectElement, items) {
  if (!selectElement) return;
  selectElement.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    selectElement.appendChild(option);
  });
}
