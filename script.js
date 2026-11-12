var firebaseConfig = {
  apiKey: "AIzaSyBxKhAyZ47p23K1LgC60Elods6VcvxPhdk",
  authDomain: "pharmastock-5ca52.firebaseapp.com",
  projectId: "pharmastock-5ca52",
  storageBucket: "pharmastock-5ca52.firebasestorage.app",
  messagingSenderId: "840319826243",
  appId: "1:840319826243:web:436d2c68afff799ade57f6"
};

var drugs = [];
var barcodes = {};
var scanner = null;
var auth = null;
var db = null;
var currentUser = null;
var authChecked = false;

function showAuthScreen(which) {
  document.getElementById("authScreen").style.display = "block";
  document.getElementById("appShell").style.display = "none";
  var boxes = ["loadingBox", "loginBox", "verifyBox"];
  for (var i = 0; i < boxes.length; i++) {
    document.getElementById(boxes[i]).style.display = (boxes[i] === which) ? "block" : "none";
  }
  window.scrollTo(0, 0);
}

function showApp() {
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appShell").style.display = "block";
  document.getElementById("accountStatus").innerHTML =
    "Logged in as <b>" + currentUser.email + "</b>. Your drugs are saved in your online account.";
  showPage("home");
  loadCloud();
}

function friendlyError(e) {
  var code = e.code || "";
  if (code === "auth/email-already-in-use") { return "This email already has an account. Tap Log in instead."; }
  if (code === "auth/weak-password") { return "The password is too short. Use at least 6 characters."; }
  if (code === "auth/invalid-email") { return "This email address is not valid."; }
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "Wrong email or password.";
  }
  if (code === "auth/too-many-requests") { return "Too many tries. Please wait a few minutes and try again."; }
  if (code === "auth/network-request-failed") { return "No internet connection. Please try again."; }
  return e.message;
}

function loadCloud() {
  db.collection("users").doc(currentUser.uid).get().then(function (doc) {
    if (doc.exists) {
      var data = doc.data();
      drugs = data.drugs || [];
      barcodes = data.barcodes || {};
    } else {
      drugs = [];
      barcodes = {};
    }
    showDrugs();
  }).catch(function (e) {
    alert("Could not load your stock: " + e.message);
  });
}

function saveDrugs() {
  if (currentUser && db) {
    db.collection("users").doc(currentUser.uid).set({
      drugs: drugs,
      barcodes: barcodes
    }).catch(function (e) {
      alert("Could not save online: " + e.message);
    });
  }
}

function signUp() {
  var email = document.getElementById("loginEmail").value;
  var password = document.getElementById("loginPassword").value;
  if (email === "" || password === "") {
    alert("Please enter your email and a password.");
    return;
  }
  auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
    document.getElementById("loginPassword").value = "";
    return cred.user.sendEmailVerification();
  }).then(function () {
    alert("Account created. We sent a verification email. Please open it.");
  }).catch(function (e) {
    alert(friendlyError(e));
  });
}

function logIn() {
  var email = document.getElementById("loginEmail").value;
  var password = document.getElementById("loginPassword").value;
  if (email === "" || password === "") {
    alert("Please enter your email and password.");
    return;
  }
  auth.signInWithEmailAndPassword(email, password).then(function () {
    document.getElementById("loginPassword").value = "";
  }).catch(function (e) {
    alert(friendlyError(e));
  });
}

function checkVerified() {
  var user = auth.currentUser;
  if (!user) { return; }
  user.reload().then(function () {
    if (user.emailVerified) {
      return user.getIdToken(true).then(function () {
        currentUser = user;
        showApp();
      });
    } else {
      alert("Your email is not verified yet. Open the email we sent, tap the link, then try again.");
    }
  }).catch(function (e) {
    alert(friendlyError(e));
  });
}

function resendEmail() {
  var user = auth.currentUser;
  if (!user) { return; }
  user.sendEmailVerification().then(function () {
    alert("We sent the email again. Check your inbox and your Spam folder.");
  }).catch(function (e) {
    alert(friendlyError(e));
  });
}

function logOut() {
  auth.signOut();
}

function resetPassword() {
  var email = document.getElementById("loginEmail").value;
  if (email === "") {
    alert("Type your email in the Email box first.");
    return;
  }
  auth.sendPasswordResetEmail(email).then(function () {
    alert("We sent you an email to reset your password.");
  }).catch(function (e) {
    alert(friendlyError(e));
  });
}

if (typeof firebase === "undefined") {
  document.getElementById("loadingText").innerHTML = "Cannot connect. Please check your internet and refresh the page.";
} else {
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged(function (user) {
      authChecked = true;
      currentUser = user;
      if (!user) {
        drugs = [];
        barcodes = {};
        showAuthScreen("loginBox");
      } else if (!user.emailVerified) {
        document.getElementById("verifyEmail").innerHTML = user.email;
        showAuthScreen("verifyBox");
      } else {
        showApp();
      }
    });
  } catch (e) {
    document.getElementById("loadingText").innerHTML = "Could not start. Please refresh the page.";
  }

  setTimeout(function () {
    if (!authChecked && auth) {
      showAuthScreen("loginBox");
      document.getElementById("slowNote").style.display = "block";
    }
  }, 8000);
}

function toggleMenu() {
  var menu = document.getElementById("menu");
  var button = document.getElementById("menuButton");
  if (menu.className.indexOf("open") === -1) {
    menu.className = "open";
    button.innerHTML = "&#10005;";
  } else {
    menu.className = "";
    button.innerHTML = "&#9776;";
  }
}

function showPage(id) {
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].className = "page";
  }
  document.getElementById("page-" + id).className = "page active";

  var items = document.querySelectorAll("#menu button");
  for (var j = 0; j < items.length; j++) {
    if (items[j].getAttribute("data-page") === id) {
      items[j].className = "active";
    } else {
      items[j].className = "";
    }
  }

  document.getElementById("menu").className = "";
  document.getElementById("menuButton").innerHTML = "&#9776;";

  if (id !== "add") { stopScan(); }
  window.scrollTo(0, 0);
}

function readGS1(text) {
  var result = {};
  var GS = String.fromCharCode(29);
  text = text.replace(/^\]d2/, "");

  if (text.indexOf("(01)") === 0) {
    var re = /\((\d{2})\)([^(]*)/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m[1] === "01") { result.gtin = m[2]; }
      if (m[1] === "17") { result.expiry = m[2]; }
      if (m[1] === "10") { result.batch = m[2]; }
    }
    return result;
  }

  if (text.length < 17 || text.indexOf("01") !== 0) {
    return result;
  }

  var i = 0;
  while (i < text.length) {
    var ai = text.substr(i, 2);
    if (ai === "01") {
      result.gtin = text.substr(i + 2, 14);
      i += 16;
    } else if (ai === "17") {
      result.expiry = text.substr(i + 2, 6);
      i += 8;
    } else if (ai === "11" || ai === "15") {
      i += 8;
    } else if (ai === "10" || ai === "21") {
      var end = text.indexOf(GS, i + 2);
      if (end === -1) { end = text.length; }
      if (ai === "10") { result.batch = text.substring(i + 2, end); }
      i = end + 1;
    } else {
      break;
    }
  }
  return result;
}

function expiryToDate(yymmdd) {
  if (!yymmdd || yymmdd.length !== 6) { return ""; }
  var year = 2000 + Number(yymmdd.substr(0, 2));
  var month = Number(yymmdd.substr(2, 2));
  var day = Number(yymmdd.substr(4, 2));
  if (day === 0) {
    day = new Date(year, month, 0).getDate();
  }
  var mm = month < 10 ? "0" + month : "" + month;
  var dd = day < 10 ? "0" + day : "" + day;
  return year + "-" + mm + "-" + dd;
}

function startScan() {
  if (scanner) { return; }
  scanner = new Html5Qrcode("reader", {
    formatsToSupport: [
      Html5QrcodeSupportedFormats.DATA_MATRIX,
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128
    ],
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    verbose: false
  });
  scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    function (text) {
      stopScan();
      var data = readGS1(text);

      if (data.gtin) {
        document.getElementById("barcode").value = data.gtin;
        if (data.batch) { document.getElementById("batch").value = data.batch; }
        if (data.expiry) { document.getElementById("expiry").value = expiryToDate(data.expiry); }
        if (barcodes[data.gtin]) {
          document.getElementById("name").value = barcodes[data.gtin];
        } else {
          alert("New drug. Please type its name.");
        }
      } else {
        document.getElementById("barcode").value = text;
        if (barcodes[text]) {
          document.getElementById("name").value = barcodes[text];
        } else {
          alert("New drug. Please type its name.");
        }
      }
    },
    function () {}
  ).catch(function (err) {
    alert("Camera problem: " + err);
    scanner = null;
  });
}

function stopScan() {
  if (scanner) {
    scanner.stop().then(function () {
      scanner.clear();
      scanner = null;
    }).catch(function () {
      scanner = null;
    });
  }
}

function addDrug() {
  var name = document.getElementById("name").value;
  var barcode = document.getElementById("barcode").value;

  if (name === "" || document.getElementById("expiry").value === "") {
    alert("Please enter the drug name and expiry date.");
    return;
  }

  if (barcode !== "") {
    barcodes[barcode] = name;
  }

  drugs.push({
    name: name,
    batch: document.getElementById("batch").value,
    quantity: Number(document.getElementById("quantity").value),
    expiry: document.getElementById("expiry").value
  });
  saveDrugs();
  showDrugs();

  document.getElementById("barcode").value = "";
  document.getElementById("name").value = "";
  document.getElementById("batch").value = "";
  document.getElementById("quantity").value = "";
  document.getElementById("expiry").value = "";

  alert("Drug added. You can see it in Stock.");
}

function sellDrug(index) {
  if (drugs[index].quantity > 0) {
    drugs[index].quantity = drugs[index].quantity - 1;
  }
  saveDrugs();
  showDrugs();
}

function deleteDrug(index) {
  if (confirm("Delete this drug?")) {
    drugs.splice(index, 1);
    saveDrugs();
    showDrugs();
  }
}

function showDrugs() {
  drugs.sort(function (a, b) {
    return new Date(a.expiry) - new Date(b.expiry);
  });

  var searchText = document.getElementById("search").value.toLowerCase();
  var list = document.getElementById("stockList");
  list.innerHTML = "";

  var expiredCount = 0;
  var soonCount = 0;
  var lowCount = 0;

  for (var i = 0; i < drugs.length; i++) {
    var d = drugs[i];
    var daysLeft = Math.floor((new Date(d.expiry) - new Date()) / 86400000);

    var color = "#d4f5dd";
    if (daysLeft < 0) {
      color = "#ffcdd2";
      expiredCount++;
    } else if (daysLeft <= 30) {
      color = "#ffe0b2";
      soonCount++;
    }

    if (d.quantity <= 5) {
      lowCount++;
    }

    if (d.name.toLowerCase().indexOf(searchText) === -1) {
      continue;
    }

    var quantityText = d.quantity;
    if (d.quantity <= 5) {
      quantityText = d.quantity + " <b style='color:red'>LOW</b>";
    }

    list.innerHTML +=
      "<tr style='background:" + color + "'><td>" + d.name + "</td><td>" +
      d.batch + "</td><td>" + quantityText + "</td><td>" + d.expiry +
      "</td><td>" + daysLeft + "</td><td><button class='sell' onclick='sellDrug(" + i +
      ")'>Sell 1</button></td><td><button class='delete' onclick='deleteDrug(" + i +
      ")'>Delete</button></td></tr>";
  }

  document.getElementById("expiredCount").innerHTML = expiredCount;
  document.getElementById("soonCount").innerHTML = soonCount;
  document.getElementById("lowCount").innerHTML = lowCount;
}

var slideIndex = 0;
setInterval(function () {
  var slides = document.querySelectorAll(".bg img");
  if (slides.length === 0) { return; }
  slides[slideIndex].className = "";
  slideIndex = (slideIndex + 1) % slides.length;
  slides[slideIndex].className = "show";
}, 5000);
