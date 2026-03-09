const jobType = document.getElementById("jobType");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const waiverForm = document.getElementById("waiverForm");
const captureArea = document.getElementById("captureArea");

const sections = {
  lockout: document.getElementById("lockoutSection"),
  tire: document.getElementById("tireSection"),
  fuel: document.getElementById("fuelSection"),
  jump: document.getElementById("jumpSection")
};

function updateSections() {
  Object.values(sections).forEach(section => {
    if (section) section.classList.add("hidden");
  });

  const selected = jobType.value;
  if (sections[selected]) {
    sections[selected].classList.remove("hidden");
  }
}

function resetFormCompletely() {
  waiverForm.reset();
  updateSections();
  clearSignature();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

jobType.addEventListener("change", updateSections);

resetBtn.addEventListener("click", () => {
  if (confirm("Clear the form and start fresh?")) {
    resetFormCompletely();
  }
});

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const canvas = await html2canvas(captureArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.scrollWidth
    });

    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `damage-waiver-${timestamp}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    alert("Image saved. Upload that image wherever you need it.");

    resetFormCompletely();
  } catch (error) {
    alert("There was a problem saving the image.");
    console.error(error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save as Image";
  }
});

window.addEventListener("load", () => {
  updateSections();
  setupSignaturePad();
});

/* Signature Pad */
const signatureCanvas = document.getElementById("signaturePad");
const clearSignatureBtn = document.getElementById("clearSignatureBtn");
let sigCtx;
let drawing = false;

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = signatureCanvas.getBoundingClientRect();

  signatureCanvas.width = rect.width * ratio;
  signatureCanvas.height = rect.height * ratio;

  sigCtx = signatureCanvas.getContext("2d");
  sigCtx.setTransform(1, 0, 0, 1, 0, 0);
  sigCtx.scale(ratio, ratio);
  sigCtx.lineWidth = 2;
  sigCtx.lineCap = "round";
  sigCtx.strokeStyle = "#000";
}

function setupSignaturePad() {
  resizeCanvas();

  signatureCanvas.addEventListener("pointerdown", startDraw);
  signatureCanvas.addEventListener("pointermove", draw);
  signatureCanvas.addEventListener("pointerup", endDraw);
  signatureCanvas.addEventListener("pointerleave", endDraw);

  clearSignatureBtn.addEventListener("click", clearSignature);

  window.addEventListener("resize", handleCanvasResize);
}

function handleCanvasResize() {
  const existing = signatureCanvas.toDataURL();
  resizeCanvas();

  const img = new Image();
  img.onload = () => {
    sigCtx.drawImage(img, 0, 0, signatureCanvas.clientWidth, signatureCanvas.clientHeight);
  };
  img.src = existing;
}

function getCanvasPoint(e) {
  const rect = signatureCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDraw(e) {
  drawing = true;
  const point = getCanvasPoint(e);
  sigCtx.beginPath();
  sigCtx.moveTo(point.x, point.y);
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const point = getCanvasPoint(e);
  sigCtx.lineTo(point.x, point.y);
  sigCtx.stroke();
}

function endDraw() {
  drawing = false;
}

function clearSignature() {
  if (!sigCtx) return;
  sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
}