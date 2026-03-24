const API_URL = "https://api-test.ozarkroadside.com"
const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("towbookUsername");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");
const authStatusText = document.getElementById("authStatusText");
const sessionExpiryText = document.getElementById("sessionExpiryText");

const waiverForm = document.getElementById("waiverForm");
const captureArea = document.getElementById("captureArea");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

const jobNumberInput = document.getElementById("jobNumber");
const jobNumberDisplay = document.getElementById("jobNumberDisplay");
const poDisplay = document.getElementById("poDisplay");
const pullBtn = document.getElementById("pullTowbookBtn");
const jobType = document.getElementById("jobType");

const generalReleaseInitials = document.getElementById("generalReleaseInitials");
const lockoutInitials = document.getElementById("lockoutInitials");
const tireInitials = document.getElementById("tireInitials");
const fuelInitials = document.getElementById("fuelInitials");
const jumpInitials = document.getElementById("jumpInitials");
const outOfScopeInitials = document.getElementById("outOfScopeInitials");

const initialsFields = [
  generalReleaseInitials,
  lockoutInitials,
  tireInitials,
  fuelInitials,
  jumpInitials,
  outOfScopeInitials
];

const sections = {
  lockout: document.getElementById("lockoutSection"),
  tire: document.getElementById("tireSection"),
  fuel: document.getElementById("fuelSection"),
  jump: document.getElementById("jumpSection"),
  outofscope: document.getElementById("outofscopeSection")
};

const notesField = document.getElementById("notes");
const declinedToSignOverride = document.getElementById("declinedToSignOverride");
const declinedSignMarker = document.getElementById("declinedSignMarker");
const verificationSection = document.getElementById("verificationSection");
const idVerifiedCheckbox = document.getElementById("idVerified");

const signatureCanvas = document.getElementById("signaturePad");
const clearSignatureBtn = document.getElementById("clearSignatureBtn");

let sigCtx;
let drawing = false;
let hasSignature = false;

// ==================== AUTH ====================

function setLoginMessage(message, type = "") {
  loginMessage.textContent = message || "";
  loginMessage.className = `login-message ${type}`.trim();
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return value;
  }
}

function showLoginScreen() {
  loginScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
  authStatusText.textContent = "Not logged in";
  sessionExpiryText.textContent = "";
}

function showAppScreen(username, expiresAt) {
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  authStatusText.textContent = `Logged in as: ${username}`;
  sessionExpiryText.textContent = `Session expires: ${formatDateTime(expiresAt)}`;
  
  setTimeout(() => {
	  ensureSignaturePadReady();
  }, 0);
}

async function checkAuthStatus() {
  try {
    const res = await fetch(`${API_URL}/auth/status`, {
      credentials: "include"
    });

    if (!res.ok) {
      showLoginScreen();
      return;
    }

    const data = await res.json();
    if (data.authenticated) {
      showAppScreen(data.username, data.expires_at);
    } else {
      showLoginScreen();
    }
  } catch (err) {
    console.error(err);
    showLoginScreen();
    setLoginMessage("Could not reach the local backend.", "error");
  }
}

async function loginTowbookUser(username) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username })
  });

  const raw = await res.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (e) {
    data = { error: raw || `Login failed (${res.status})` };
  }

  if (!res.ok) {
    throw data;
  }

  return data;
}

async function logoutTowbookUser() {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  if (!username) {
    setLoginMessage("Please enter your Towbook username.", "error");
    usernameInput.focus();
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Checking Towbook user...";
  setLoginMessage("");

  try {
    const data = await loginTowbookUser(username);
    showAppScreen(data.username, data.expires_at);
    setLoginMessage("");
    usernameInput.value = "";
  } catch (err) {
    console.error(err);

    if (err.locked_until) {
      setLoginMessage(
        `That username is locked until ${formatDateTime(err.locked_until)}.`,
        "error"
      );
    } else if (typeof err.remaining_attempts === "number") {
      setLoginMessage(
        `${err.error} Remaining attempts: ${err.remaining_attempts}.`,
        "error"
      );
    } else {
      setLoginMessage(err.error || "Login failed.", "error");
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log In";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await logoutTowbookUser();
  } catch (err) {
    console.error(err);
  }

  showLoginScreen();
  setLoginMessage("You have been logged out.", "success");
});

// ==================== DISPLAY HELPERS ====================

function updateJobNumberDisplay() {
  const value = jobNumberInput.value.trim();
  jobNumberDisplay.textContent = value || "ENTER JOB NUMBER";
}

function updatePoDisplay(value = "") {
  poDisplay.textContent = value || "NOT LOADED";
}

// ==================== SECTION CONTROL ====================

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

  if (lockoutInitials) lockoutInitials.required = selected === "lockout";
  if (tireInitials) tireInitials.required = selected === "tire";
  if (fuelInitials) fuelInitials.required = selected === "fuel";
  if (jumpInitials) jumpInitials.required = selected === "jump";
  if (outOfScopeInitials) outOfScopeInitials.required = selected === "outofscope";
}

// ==================== DATE ====================

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("serviceDate").value = today;
  document.getElementById("finalInspectionDate").value = today;
}

// ==================== RESET ====================

function resetFormCompletely() {
  waiverForm.reset();
  updateSections();
  clearSignature();
  setTodayDate();
  updateJobNumberDisplay();
  updatePoDisplay("");
  updateDeclinedToSignState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== VALIDATION ====================

function getVisibleRequiredFields() {
  return Array.from(waiverForm.querySelectorAll("[required]"))
    .filter(field => field.offsetParent !== null);
}

function updateDeclinedToSignState() {
  const isOverrideChecked = declinedToSignOverride.checked;
  notesField.required = isOverrideChecked;

  if (declinedSignMarker) {
    declinedSignMarker.classList.toggle("hidden", !isOverrideChecked);
  }

  if (isOverrideChecked) {
    notesField.placeholder = "Required: explain why the customer declined to sign the waiver.";
    signatureCanvas.classList.add("signature-optional");

    if (verificationSection) verificationSection.classList.add("hidden");
    if (idVerifiedCheckbox) idVerifiedCheckbox.required = false;
  } else {
    notesField.placeholder = "Optional notes about the service...";
    signatureCanvas.classList.remove("signature-optional");

    if (verificationSection) verificationSection.classList.remove("hidden");
    if (idVerifiedCheckbox) idVerifiedCheckbox.required = true;
  }
}

function validateVisibleFields() {
  updateDeclinedToSignState();
  updateSections();

  if (generalReleaseInitials && !generalReleaseInitials.value.trim()) {
    alert("Customer initials are required for the General Release.");
    generalReleaseInitials.focus();
    return false;
  }

  const selected = jobType.value;

  if (selected === "lockout" && lockoutInitials && !lockoutInitials.value.trim()) {
    alert("Customer initials are required for the Lockout section.");
    lockoutInitials.focus();
    return false;
  }

  if (selected === "tire" && tireInitials && !tireInitials.value.trim()) {
    alert("Customer initials are required for the Tire Service section.");
    tireInitials.focus();
    return false;
  }

  if (selected === "fuel" && fuelInitials && !fuelInitials.value.trim()) {
    alert("Customer initials are required for the Fuel Delivery section.");
    fuelInitials.focus();
    return false;
  }

  if (selected === "jump" && jumpInitials && !jumpInitials.value.trim()) {
    alert("Customer initials are required for the Jump Start section.");
    jumpInitials.focus();
    return false;
  }

  if (selected === "outofscope" && outOfScopeInitials && !outOfScopeInitials.value.trim()) {
    alert("Customer initials are required for the Out of Scope section.");
    outOfScopeInitials.focus();
    return false;
  }

  for (const field of getVisibleRequiredFields()) {
    if (field === notesField && declinedToSignOverride.checked && !field.value.trim()) {
      alert("Additional Notes are required when the customer declines to sign.");
      field.focus();
      return false;
    }

    if (field.type === "radio") {
      const group = waiverForm.querySelectorAll(`input[name="${field.name}"]`);
      const oneChecked = Array.from(group).some(r => r.checked);
      if (!oneChecked) return alertFail(field);
    } else if (field.type === "checkbox") {
      if (!field.checked) return alertFail(field);
    } else if (!field.value.trim()) {
      return alertFail(field);
    }
  }

  if (declinedToSignOverride.checked) {
    return true;
  }

  if (!hasSignature) {
    alert("Customer signature is required unless the decline override box is checked.");
    return false;
  }

  return true;
}

function alertFail(field) {
  alert("Please complete all required fields.");
  field.focus();
  return false;
}

// ==================== SAVE IMAGE ====================


async function saveImageFromCanvas(canvas, filename) {
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, "image/jpeg", 0.98);
  });

function splitCanvasIntoTwo(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const overlap = Math.floor(height * 0.08); // small overlap so text doesn't get cut
  const halfHeight = Math.ceil(height / 2);

  const topHeight = Math.min(height, halfHeight + overlap);
  const bottomStartY = Math.max(0, halfHeight - overlap);
  const bottomHeight = height - bottomStartY;

  const topCanvas = document.createElement("canvas");
  topCanvas.width = width;
  topCanvas.height = topHeight;

  const bottomCanvas = document.createElement("canvas");
  bottomCanvas.width = width;
  bottomCanvas.height = bottomHeight;

  const topCtx = topCanvas.getContext("2d");
  const bottomCtx = bottomCanvas.getContext("2d");

  topCtx.fillStyle = "#fff";
  topCtx.fillRect(0, 0, topCanvas.width, topCanvas.height);
  topCtx.drawImage(
    sourceCanvas,
    0, 0, width, topHeight,
    0, 0, width, topHeight
  );

  bottomCtx.fillStyle = "#fff";
  bottomCtx.fillRect(0, 0, bottomCanvas.width, bottomCanvas.height);
  bottomCtx.drawImage(
    sourceCanvas,
    0, bottomStartY, width, bottomHeight,
    0, 0, width, bottomHeight
  );

  return [topCanvas, bottomCanvas];
}

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

function isAppleMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS13Plus = platform === "MacIntel" && maxTouchPoints > 1;

  return iOSDevice || iPadOS13Plus;
}

function showSavedImageInstructions(fileLabel) {
  if (isAppleMobileDevice()) {
    alert(
      `Images downloaded: ${fileLabel}.\n\n` +
      `On iPhone, they may save to your Downloads folder instead of Photos.\n\n` +
      `To move them to your Photo Library:\n` +
      `1. Open the Files app\n` +
      `2. Tap Browse > Downloads\n` +
      `3. Open each image\n` +
      `4. Tap the Share button\n` +
      `5. Tap "Save Image"\n\n` +
      `Then open Towbook and upload both photos.`
    );
  } else {
    alert(`Images saved: ${fileLabel}`);
  }
}

// ==================== TOWBOOK ====================

function mapJobType(reason) {
  const r = (reason || "").toLowerCase();

  if (r.includes("jump")) return "jump";
  if (r.includes("lockout")) return "lockout";
  if (r.includes("tire")) return "tire";
  if (r.includes("fuel")) return "fuel";
  if (r.includes("scope")) return "outofscope";

  return "";
}

async function pullFromTowbook(jobNumber) {
  const res = await fetch(
    `${API_URL}/towbook-call?jobNumber=${encodeURIComponent(jobNumber)}`,
    {
      credentials: "include"
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Towbook error.");
  }

  document.getElementById("customerName").value = data.customer_name || "";
  document.getElementById("phone").value = data.phone || "";
  document.getElementById("vehicle").value = data.vehicle || "";
  updatePoDisplay(data.po || "");

  if (data.job_type) {
    const mapped = mapJobType(data.job_type);
    if (mapped) {
      jobType.value = mapped;
      updateSections();
    }
  }
}

// ==================== BUTTON ====================

pullBtn.addEventListener("click", async () => {
  const jobNum = jobNumberInput.value.trim();

  if (!jobNum || jobNum.length < 3) {
    alert("Please enter a valid Job Number first.");
    return;
  }

  const originalText = pullBtn.textContent;
  pullBtn.disabled = true;
  pullBtn.textContent = "Generating Job Info...";
  pullBtn.style.background = "#666";

  try {
    await pullFromTowbook(jobNum);
    alert("✅ Job info generated successfully!");
  } catch (err) {
    console.error(err);
    if ((err.message || "").toLowerCase().includes("login required")) {
      showLoginScreen();
      setLoginMessage("Your session expired. Please log in again.", "error");
    }
    alert(err.message || "Could not connect to Towbook.");
  } finally {
    pullBtn.disabled = false;
    pullBtn.textContent = originalText;
    pullBtn.style.background = "#1f6feb";
  }
});

// ==================== EVENTS ====================

jobType.addEventListener("change", updateSections);
declinedToSignOverride.addEventListener("change", updateDeclinedToSignState);
jobNumberInput.addEventListener("input", updateJobNumberDisplay);

jobNumberInput.addEventListener("change", async () => {
  const jobNum = jobNumberInput.value.trim();
  updateJobNumberDisplay();

  if (!jobNum) return;

  try {
    await pullFromTowbook(jobNum);
  } catch (err) {
    console.error(err);
  }
});

resetBtn.addEventListener("click", () => {
  if (confirm("Start fresh?")) resetFormCompletely();
});

saveBtn.addEventListener("click", async () => {
  if (!validateVisibleFields()) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    updateJobNumberDisplay();

    const canvas = await html2canvas(captureArea, {
      scale: 4,
      useCORS: true,
      backgroundColor: "#fff",
      windowWidth: document.documentElement.scrollWidth
    });

    const job = jobNumberInput.value.trim() || "NOJOB";
    const date = document.getElementById("serviceDate").value || new Date().toISOString().split("T")[0];

    const filename = `${job}_${date}`;
	const [topCanvas, bottomCanvas] =  splitCanvasIntoTwo(canvas);
  
	const file1 = `${filenameBase}_part1.jpg`;
	const file2 = `${filenameBase}_part2.jpg`;
	
	await saveImageFromCanvas(topCanvas, file1);
	await saveImageFromCanvas(bottomCanvas, file2);

	showSavedImageInstructions(`${file1} and ${file2}`);
    resetFormCompletely();
  } catch (err) {
    console.error(err);
    alert("Save failed.");
  }

  saveBtn.disabled = false;
  saveBtn.textContent = "Save as Image";
});

// ==================== SIGNATURE ====================

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
  window.addEventListener("pointerup", endDraw);
  signatureCanvas.addEventListener("pointerleave", endDraw);

  clearSignatureBtn.addEventListener("click", clearSignature);
  window.addEventListener("resize", handleCanvasResize);
}

function handleCanvasResize() {
  if (appScreen.classList.contains("hidden")) return;

  const existing = signatureCanvas.toDataURL();
  resizeCanvas();

  const img = new Image();
  img.onload = () => {
    sigCtx.drawImage(img, 0, 0, signatureCanvas.clientWidth, signatureCanvas.clientHeight);
  };
  img.src = existing;
}

function getPoint(e) {
  const rect = signatureCanvas.getBoundingClientRect();

  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDraw(e) {
  e.preventDefault();
  drawing = true;
  hasSignature = true;
  const p = getPoint(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const p = getPoint(e);
  sigCtx.lineTo(p.x, p.y);
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

// ==================== INIT ====================
let signatureInitialized = false;

function ensureSignaturePadReady() {
	if (!signatureInitialized) {
		setupSignaturePad();
		signatureInitialized = true;
	} else {
		resizeCanvas();
	}
}

window.addEventListener("load", async () => {
  updateSections();
  setTodayDate();
  updateJobNumberDisplay();
  updatePoDisplay("");
  updateDeclinedToSignState();

  initialsFields.forEach(field => {
    if (!field) return;
    field.addEventListener("input", () => {
      field.value = field.value.toUpperCase().replace(/[^A-Z]/g, "");
    });
  });

  await checkAuthStatus();
});