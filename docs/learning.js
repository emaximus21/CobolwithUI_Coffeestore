const copyButton = document.querySelector('#copy-program');
const programSource = document.querySelector('#program-source');

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(programSource.textContent);
    copyButton.textContent = 'Copied!';
  } catch {
    copyButton.textContent = 'Open code above to copy';
  }
  window.setTimeout(() => {
    copyButton.innerHTML = 'Copy program <span aria-hidden="true">▢</span>';
  }, 1800);
});