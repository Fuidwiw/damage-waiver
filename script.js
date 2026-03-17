const jobType = document.getElementById("jobType");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const waiverForm = document.getElementById("waiverForm");
const captureArea = document.getElementById("captureArea");
const jobNumberInput = document.getElementById("jobNumber");
const jobNumberDisplay = document.getElementById("jobNumberDisplay");

const sections = {
  lockout: document.getElementById("lockoutSection"),
  tire: document.getElementById("tireSection"),
  fuel: document.getElementById("fuelSection"),
  jump: document.getElementById("jumpSection"),
  outofscope: document.getElementById("outofscopeSection")
};

const signatureCanvas = document.getElementById("signaturePad");
const clearSignatureBtn = document.getElementById("clearSignatureBtn");

let sigCtx;
let drawing = false;
let hasSignature = false;

function updateJobNumberDisplay() {
  const value = jobNumberInput.value.trim();
  jobNumberDisplay.textContent = value || "ENTER JOB NUMBER";
}

function updateSections() {
  Object.values(sections).forEach(section => {
    if (section) section.classList.add("hidden");
  });

  const selected = jobType.value;
  if (sections[selected]) {
    sections[selected].classList.remove("hidden");
  }

  const mileageInput = document.getElementById("mileage");
  mileageInput.required = selected === "tire";
}

function setTodayDate() {
  const serviceDate = document.getElementById("serviceDate");
  const finalDate = document.getElementById("finalInspectionDate");
  const today = new Date().toISOString().split("T")[0];

  if (serviceDate) serviceDate.value = today;
  if (finalDate) finalDate.value = today;
}

function resetFormCompletely() {
  waiverForm.reset();
  updateSections();
  clearSignature();
  setTodayDate();
  updateJobNumberDisplay();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getVisibleRequiredFields() {
  const allRequired = waiverForm.querySelectorAll("[required]");
  return Array.from(allRequired).filter(field => field.offsetParent !== null);
}

function validateVisibleFields() {
  const visibleRequiredFields = getVisibleRequiredFields();

  for (const field of visibleRequiredFields) {
    if (field.type === "radio") {
      const group = waiverForm.querySelectorAll(`input[name="${field.name}"]`);
      const oneChecked = Array.from(group).some(radio => radio.checked);

      if (!oneChecked) {
        alert("Please complete all required fields before saving.");
        field.focus();
        return false;
      }
    } else if (field.type === "checkbox") {
      if (!field.checked) {
        alert("Please complete all required fields before saving.");
        field.focus();
        return false;
      }
    } else if (!field.value || !field.value.trim()) {
      alert("Please complete all required fields before saving.");
      field.focus();
      return false;
    }
  }

  if (!hasSignature) {
    alert("Customer signature is required before saving.");
    return false;
  }

  return true;
}

async function saveImageFromCanvas(canvas, filename) {
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, "image/jpeg", 0.98);
  });

  if (!blob) {
    throw new Error("Could not create image file.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

jobType.addEventListener("change", updateSections);
jobNumberInput.addEventListener("input", updateJobNumberDisplay);

resetBtn.addEventListener("click", () => {
  if (confirm("Clear the form and start fresh?")) {
    resetFormCompletely();
  }
});

saveBtn.addEventListener("click", async () => {
  if (!validateVisibleFields()) {
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    updateJobNumberDisplay();

    const canvas = await html2canvas(captureArea, {
      scale: 4,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.scrollWidth
    });

    const jobNumber = document.getElementById("jobNumber").value.trim() || "NOJOB";
    let dateField = document.getElementById("serviceDate").value;

    if (!dateField) {
      dateField = new Date().toISOString().split("T")[0];
    }

    const filename = `${jobNumber}_${dateField}.jpg`;

    await saveImageFromCanvas(canvas, filename);

    alert("Image saved.");

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
  setTodayDate();
  updateJobNumberDisplay();
});

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
  hasSignature = true;

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
  hasSignature = false;
}