// --- PAFA TEAMSPORT E-TICARET COMMON.JS ---
// Bu dosya, tüm HTML sayfaları tarafından paylaşılan tüm kritik JavaScript mantığını içerir.

// === 1. FIREBASE SDK IMPORTS ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    deleteDoc, 
    collection, 
    query, 
    getDocs, 
    Timestamp,
    onSnapshot,
    where,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// === 2. FIREBASE KURULUMU ===
const firebaseConfig = {
    apiKey: "AIzaSyCcpgbcbHqMjkyxVmRllLj5ZV1yljMhsPk",
    authDomain: "whatsapp-415e2.firebaseapp.com",
    databaseURL: "https://whatsapp-415e2-default-rtdb.firebaseio.com",
    projectId: "whatsapp-415e2",
    storageBucket: "whatsapp-415e2.firebasestorage.app",
    messagingSenderId: "632645198033",
    appId: "1:632645198033:web:430cc6dc6671703f25a5f0",
    measurementId: "G-52SZ74C9F4"
};

// Global Firebase değişkenleri
let app, auth, db, analytics;
export let currentUser = null; // Aktif kullanıcıyı (auth + firestore verisi) tutar
export let isAuthReady = false; // Auth durumunun ilk kontrolü yapıldı mı?
const ADMIN_EMAIL = "admin@e-ticaret.com"; // Admin e-postası

// Koleksiyon referansları
export let productsCollection, ordersCollection, usersCollection;

// Stilleri ve Firebase'i başlat
try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);

    // Koleksiyon referanslarını ayarla
    productsCollection = collection(db, "products");
    ordersCollection = collection(db, "orders");
    usersCollection = collection(db, "users");
    
    // CSS Değişkenlerini ve Stilleri Ekle (Tüm sayfalarda tutarlılık için)
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        :root {
            --primary: #059669;
            --primary-dark: #047857;
            --primary-darker: #065f46;
            --accent: #f59e0b;
            --light: #f8fafc;
            --dark: #1e293b;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            scroll-behavior: smooth;
        }
        
        .gradient-bg { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, var(--primary-darker) 100%); }
        .category-card { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%); border: 1px solid #e2e8f0; }
        .category-card:hover { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); transform: translateY(-10px); border-color: var(--primary); }
        .product-card { transition: all 0.3s ease; background: white; border-radius: 12px; overflow: hidden; }
        .product-card:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .floating-animation { animation: floating 6s ease-in-out infinite; }
        @keyframes floating { 0% { transform: translate(0, 0px) rotate(0deg); } 50% { transform: translate(0, -20px) rotate(2deg); } 100% { transform: translate(0, -0px) rotate(0deg); } }
        .pulse-animation { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .85; } }
        .bg-pattern { background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
        .text-shadow { text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        .btn-primary { background: linear-gradient(to right, var(--primary), var(--primary-dark)); box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4); transition: all 0.3s ease; }
        .btn-primary:hover { background: linear-gradient(to right, var(--primary-dark), var(--primary-darker)); box-shadow: 0 10px 25px rgba(5, 150, 105, 0.5); transform: translateY(-2px); }
        .btn-secondary { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); transition: all 0.3s ease; }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
        .sale-badge { position: absolute; top: 12px; right: 12px; background: linear-gradient(45deg, #ef4444, #f59e0b); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; z-index: 10; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .discount-badge { background: linear-gradient(45deg, #ef4444, #dc2626); }
        .new-badge { background: linear-gradient(45deg, var(--primary), #0ea5e9); }
        .trending-badge { background: linear-gradient(45deg, #f59e0b, #eab308); }
        .feature-card { transition: all 0.3s ease; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .feature-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1); }
        .testimonial-card { background: white; border-radius: 16px; box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        .testimonial-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1); }
        .brand-logo { filter: grayscale(100%); opacity: 0.6; transition: all 0.3s ease; }
        .brand-logo:hover { filter: grayscale(0%); opacity: 1; }
        .countdown-timer { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; }
        .timer-unit { background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px; min-width: 60px; }
        .newsletter-form { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2); }
        .sticky-header { position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.95); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        .mobile-menu { transform: translateX(-100%); transition: transform 0.3s ease; }
        .mobile-menu.open { transform: translateX(0); }
        .cart-badge { position: absolute; top: -8px; right: -8px; background: var(--accent); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
        .loading-spinner { border: 3px solid rgba(5, 150, 105, 0.3); border-radius: 50%; border-top: 3px solid var(--primary); width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .promo-banner { background: linear-gradient(90deg, var(--primary), var(--accent)); color: white; padding: 8px 0; overflow: hidden; }
        .flash-sale-badge { background: linear-gradient(45deg, #ef4444, #f59e0b); animation: pulse-flash 1.5s infinite; }
        @keyframes pulse-flash { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .discount-tag { background: linear-gradient(45deg, #ef4444, #dc2626); transform: rotate(-5deg); box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }
        .product-image-container { position: relative; overflow: hidden; }
        .product-image-container::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0) 70%, rgba(0,0,0,0.1) 100%); z-index: 1; }
        .price-slash { text-decoration: line-through; opacity: 0.7; }
        .logo-container img { width: 60px; height: 60px; object-fit: contain; }
        .mega-menu { opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s ease; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        .mega-menu.active { opacity: 1; visibility: visible; transform: translateY(0); }
        .mega-menu-column h4 { font-weight: 600; color: var(--primary); margin-bottom: 12px; font-size: 1.1rem; }
        .mega-menu-column ul li { margin-bottom: 8px; }
        .mega-menu-column ul li a { color: #4b5563; transition: color 0.2s ease; }
        .mega-menu-column ul li a:hover { color: var(--primary); }
        .countdown-digit { background: rgba(0, 0, 0, 0.8); border-radius: 8px; padding: 8px; min-width: 50px; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .product-hover-info { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); transform: translateY(100%); transition: transform 0.3s ease; padding: 16px; box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.1); }
        .product-card:hover .product-hover-info { transform: translateY(0); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .gradient-text { background: linear-gradient(90deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .footer-logo { filter: brightness(0) invert(1); }

        /* Form Odaklanma Stilleri */
        input:focus, select:focus, textarea:focus {
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.4) !important;
            outline: none;
        }
    `;
    document.head.appendChild(styleSheet);
    
    console.log("Firebase ve Stiller başarıyla başlatıldı.");
} catch (error) {
    console.error("Firebase başlatma hatası:", error);
    showModal("Kritik Hata", "Uygulama başlatılamadı. Lütfen daha sonra tekrar deneyin.");
}

// === 3. MODAL (BİLDİRİM) FONKSİYONLARI ===
export function showModal(title, message, type = 'success') {
    const modal = document.getElementById('message-modal');
    if (!modal) return;
    
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    // Tip'e göre stil (opsiyonel)
    const iconContainer = modal.querySelector('.modal-icon-container'); // Örnek
    if (iconContainer) {
        if (type === 'error') {
            iconContainer.innerHTML = `<i class="fas fa-times text-red-500"></i>`; // Örnek
        } else {
            iconContainer.innerHTML = `<i class="fas fa-check text-emerald-500"></i>`; // Örnek
        }
    }
    
    modal.classList.remove('hidden');
}

export function closeModal() {
    const modal = document.getElementById('message-modal');
    if (modal) modal.classList.add('hidden');
}
// Modal'ı global scope'a ekle ki HTML içinden (onclick) erişilebilsin
window.closeModal = closeModal;


// === 4. HEADER & FOOTER YÜKLEYİCİ ===
/**
 * Header ve Footer'ı HTML dosyalarına dinamik olarak yükler.
 * Bu, tüm sayfalarda tutarlı bir görünüm sağlar ve kod tekrarını önler.
 */
export async function loadHeaderAndFooter(currentPageId) {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    // Auth hazır olmadan header yüklemesi yapma (race condition önlemi)
    if (!isAuthReady) {
        await initAuthAndNav(); // Henüz çalışmadıysa çalıştır ve bekle
    }

    try {
        // Header'ı yükle
        if (headerPlaceholder) {
            const res = await fetch('./_header.html');
            if (!res.ok) throw new Error('Header yüklenemedi');
            const headerHtml = await res.text();
            headerPlaceholder.innerHTML = headerHtml;
        }

        // Footer'ı yükle
        if (footerPlaceholder) {
            const res = await fetch('_footer.html');
            if (!res.ok) throw new Error('Footer yüklenemedi');
            const footerHtml = await res.text();
            footerPlaceholder.innerHTML = footerHtml;
        }
        
        // Header yüklendikten sonra UI'ı ve özellikleri başlat
        updateNavAndAuthUI(currentPageId);
        initHeaderFeatures(); // Mega menü, mobil menü vb.
        
    } catch (error) {
        console.error("Header/Footer yüklenirken hata:", error);
        if (headerPlaceholder) headerPlaceholder.innerHTML = "<p class='text-red-500 text-center'>Menü yüklenemedi.</p>";
        if (footerPlaceholder) footerPlaceholder.innerHTML = "<p class='text-red-500 text-center'>Alt bilgi yüklenemedi.</p>";
    }
}


// === 5. KİMLİK DOĞRULAMA (AUTH) VE NAVİGASYON ===

/**
 * Kullanıcı kimlik doğrulama durumunu dinler (sayfa ilk yüklendiğinde).
 * Bu fonksiyon bir Promise döndürür, böylece diğer fonksiyonlar
 * auth durumunun bilinmesini bekleyebilir.
 */
export function initAuthAndNav() {
    return new Promise((resolve) => {
        if (isAuthReady) {
            resolve(currentUser);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Kullanıcı giriş yaptı. Firestore'dan ekstra verilerini (rol, adresler) çek.
                const userDocRef = doc(usersCollection, user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    currentUser = { auth: user, ...userDoc.data() };
                } else {
                    // Firestore'da kaydı olmayan (belki eski) bir kullanıcı
                    // veya kayıt olur olmaz tetiklendi
                    currentUser = { auth: user, email: user.email, name: user.displayName || 'Kullanıcı', addresses: [], role: 'customer' }; 
                }
            } else {
                // Kullanıcı çıkış yaptı
                currentUser = null;
            }
            
            isAuthReady = true;
            updateCartCount(); // Sepet sayısını da güncelle
            resolve(currentUser); // Promise'i çöz
            unsubscribe(); // Dinleyiciyi kaldır (sadece ilk yükleme için)
        });
    });
}

/**
 * Header'daki (ve Mobil Menüdeki) linkleri günceller.
 * Kimin giriş yaptığına (veya yapmadığına) göre doğru butonları gösterir.
 */
function updateNavAndAuthUI(currentPageId) {
    const authLinksDesktop = document.getElementById('auth-links-desktop');
    const userLinksDesktop = document.getElementById('user-links-desktop');
    const userEmailDesktop = document.getElementById('user-email-desktop');
    const adminLinkDesktop = document.getElementById('admin-link-desktop');
    
    const authLinksMobile = document.getElementById('auth-links-mobile');
    const userLinksMobile = document.getElementById('user-links-mobile');
    const userEmailMobile = document.getElementById('user-email-mobile');
    const adminLinkMobile = document.getElementById('admin-link-mobile');
    
    const logoutButtonDesktop = document.getElementById('logout-button-desktop');
    const logoutButtonMobile = document.getElementById('logout-button-mobile');

    // Aktif sayfa linkini vurgula (Masaüstü)
    const desktopLinks = document.querySelectorAll('#desktop-nav a');
    desktopLinks.forEach(link => {
        link.classList.remove('text-emerald-600', 'border-emerald-600', 'font-semibold'); // Önce temizle
        if (link.dataset.pageId === currentPageId) {
            link.classList.add('text-emerald-600', 'border-emerald-600', 'font-semibold');
        }
    });
    
    // Aktif sayfa linkini vurgula (Mobil)
    const mobileLinks = document.querySelectorAll('#mobile-menu-nav a');
    mobileLinks.forEach(link => {
        link.classList.remove('text-emerald-600', 'border-l-4'); // Önce temizle
        if (link.dataset.pageId === currentPageId) {
            link.classList.add('text-emerald-600', 'border-l-4');
        }
    });


    if (currentUser) {
        // Kullanıcı GİRİŞ YAPTI
        if (authLinksDesktop) authLinksDesktop.style.display = 'none';
        if (userLinksDesktop) userLinksDesktop.style.display = 'flex';
        if (authLinksMobile) authLinksMobile.style.display = 'none';
        if (userLinksMobile) userLinksMobile.style.display = 'block';

        const userEmail = currentUser.email || 'kullanici@mail.com';
        if (userEmailDesktop) userEmailDesktop.textContent = userEmail;
        if (userEmailMobile) userEmailMobile.textContent = userEmail;

        // Admin link kontrolü
        const isAdmin = currentUser.email === ADMIN_EMAIL;
        if (adminLinkDesktop) adminLinkDesktop.style.display = isAdmin ? 'block' : 'none';
        if (adminLinkMobile) adminLinkMobile.style.display = isAdmin ? 'block' : 'none';

        // Çıkış Butonları
        if (logoutButtonDesktop) logoutButtonDesktop.addEventListener('click', logoutUser);
        if (logoutButtonMobile) logoutButtonMobile.addEventListener('click', logoutUser);
        
    } else {
        // Kullanıcı GİRİŞ YAPMADI
        if (authLinksDesktop) authLinksDesktop.style.display = 'flex';
        if (userLinksDesktop) userLinksDesktop.style.display = 'none';
        if (authLinksMobile) authLinksMobile.style.display = 'block';
        if (userLinksMobile) userLinksMobile.style.display = 'none';
    }
}

/**
 * Header'daki (mega menü, mobil menü, sayaç) JS özelliklerini başlatır.
 */
function initHeaderFeatures() {
    // 1. Mobil Menü Toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMobileMenuButton = document.getElementById('close-mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => mobileMenu.classList.add('open'));
    }
    if (closeMobileMenuButton && mobileMenu) {
        closeMobileMenuButton.addEventListener('click', () => mobileMenu.classList.remove('open'));
    }
    // Mobil menü linkine tıklayınca menüyü kapat
    if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.remove('open'));
        });
    }

    // 2. Mega Menü Toggle
    const productsMenuTrigger = document.getElementById('products-menu-trigger');
    const megaMenu = document.getElementById('mega-menu');

    if (productsMenuTrigger && megaMenu) {
        productsMenuTrigger.addEventListener('mouseenter', () => megaMenu.classList.add('active'));
        productsMenuTrigger.addEventListener('mouseleave', () => {
            // Mouse'un menüye girmesi için kısa bir gecikme
            setTimeout(() => {
                if (!megaMenu.matches(':hover')) {
                    megaMenu.classList.remove('active');
                }
            }, 100);
        });
        megaMenu.addEventListener('mouseleave', () => megaMenu.classList.remove('active'));
    }
    
    // 3. Flaş İndirim Sayacını Başlat (Eğer element varsa)
    const countdownEl = document.getElementById('flash-sale-countdown');
    if (countdownEl) {
        // Hedef tarihi ayarla (Örn: 2 gün sonrası)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        targetDate.setHours(14, 38, 22, 0); // Sabit bir saat
        
        // Sayaç başlatma işlevini doğrudan kullan
        $startCountdown(
            targetDate,
            document.getElementById('countdown-days'),
            document.getElementById('countdown-hours'),
            document.getElementById('countdown-minutes'),
            document.getElementById('countdown-seconds')
        );
    }
}

/**
 * Flaş İndirim Sayacını güncelleyen ve başlatan fonksiyon.
 * @param {Date} targetDate - Geri sayımın biteceği tarih.
 * @param {HTMLElement} daysEl - Günler DOM elementi.
 * @param {HTMLElement} hoursEl - Saatler DOM elementi.
 * @param {HTMLElement} minutesEl - Dakikalar DOM elementi.
 * @param {HTMLElement} secondsEl - Saniyeler DOM elementi.
 */
export function $startCountdown(targetDate, daysEl, hoursEl, minutesEl, secondsEl) {
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            // Sayaç bitti
            if (daysEl.parentElement.parentElement) {
                 daysEl.parentElement.parentElement.innerHTML = "<span class='text-lg font-bold'>Flaş İndirim Sona Erdi!</span>";
            }
            if(countdownInterval) clearInterval(countdownInterval);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = days.toString().padStart(2, '0');
        hoursEl.textContent = hours.toString().padStart(2, '0');
        minutesEl.textContent = minutes.toString().padStart(2, '0');
        secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    updateCountdown(); // İlk çalıştırma
    const countdownInterval = setInterval(updateCountdown, 1000); // Her saniye güncelle
    // Global değişkenler için temizleme yapmayalım, tarayıcı pencere kapandığında temizler
}


/**
 * Yeni kullanıcı kaydı yapar.
 */
export async function registerUser(name, email, password) {
    // 1. Firebase Auth'da kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Auth profilini güncelle (opsiyonel ama iyi bir pratik)
    await updateProfile(user, { displayName: name });

    // 3. Firestore'da kullanıcı belgesi oluştur
    const isAdmin = (email.toLowerCase() === ADMIN_EMAIL);
    const userDocRef = doc(usersCollection, user.uid);
    await setDoc(userDocRef, {
        uid: user.uid,
        name: name,
        email: email,
        addresses: [], // Adresler için boş bir dizi
        role: isAdmin ? "admin" : "customer"
    });
}

/**
 * Kullanıcı girişi yapar.
 */
export async function signInUser(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Kullanıcı çıkışı yapar.
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        // Sayfayı yenilemek en temiz yöntemdir,
        // çünkü initAuthAndNav() her şeyi sıfırdan ve doğru yükler.
        window.location.href = './index.html';
    } catch (error) {
        console.error("Çıkış hatası:", error);
        showModal("Hata", "Çıkış yapılamadı: " + error.message, 'error');
    }
}


// === 6. HESABIM VE ADRES YÖNETİMİ ===

/**
 * Kullanıcı adresini Firestore'a kaydeder.
 */
export async function saveAddress(addressData) {
    if (!currentUser) throw new Error("Giriş yapılmamış.");
    
    const userDocRef = doc(usersCollection, currentUser.auth.uid);
    
    // Adrese benzersiz bir ID ata
    const addressWithId = { ...addressData, id: crypto.randomUUID() };

    // Eğer bu, kullanıcının ilk adresi VEYA "varsayılan" olarak işaretlendiyse,
    // diğer tüm adreslerin 'isDefault' bayrağını kaldır.
    if (addressWithId.isDefault) {
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        if (userData.addresses && userData.addresses.length > 0) {
            const updatedAddresses = userData.addresses.map(addr => ({ ...addr, isDefault: false }));
            await updateDoc(userDocRef, { addresses: updatedAddresses });
        }
    }

    // Yeni adresi ekle
    await updateDoc(userDocRef, {
        addresses: arrayUnion(addressWithId)
    });
    
    // currentUser objesini lokalde güncelle
    currentUser.addresses.push(addressWithId);
}

/**
 * Kullanıcı adresini siler.
 */
export async function deleteAddress(addressId) {
    if (!currentUser) throw new Error("Giriş yapılmamış.");

    const userDocRef = doc(usersCollection, currentUser.auth.uid);
    
    // Silinecek adresi bul
    const addressToDelete = currentUser.addresses.find(addr => addr.id === addressId);
    if (!addressToDelete) throw new Error("Adres bulunamadı.");

    // Firestore'dan adresi sil
    await updateDoc(userDocRef, {
        addresses: arrayRemove(addressToDelete)
    });

    // currentUser objesini lokalde güncelle
    currentUser.addresses = currentUser.addresses.filter(addr => addr.id !== addressId);
}

/**
 * Hesabım sayfasını (adresler ve bilgiler) yükler.
 */
export function loadAccountPage() {
    if (!currentUser) {
        window.location.href = './auth.html'; // Giriş yapmamışsa yönlendir
        return;
    }

    // Kullanıcı bilgilerini doldur
    document.getElementById('account-name').textContent = currentUser.name || currentUser.auth.displayName || 'Kullanıcı Adı';
    document.getElementById('account-email').textContent = currentUser.email;

    // Adres listesini oluştur
    renderAddressList('account-address-list');
}

/**
 * Adres listesini render eder (Hem Hesabım hem de Checkout sayfasında kullanılır)
 */
export function renderAddressList(containerId) {
    const listContainer = document.getElementById(containerId);
    if (!listContainer) return;

    if (!currentUser || !currentUser.addresses || currentUser.addresses.length === 0) {
        listContainer.innerHTML = `<p class="text-gray-500 text-center col-span-full">Kayıtlı adresiniz bulunmuyor.</p>`;
        return;
    }

    listContainer.innerHTML = ''; // Temizle
    
    currentUser.addresses.forEach(addr => {
        const isCheckoutPage = containerId.includes('checkout');
        
        const cardHtml = `
            <div class="relative p-4 border rounded-lg ${isCheckoutPage ? 'cursor-pointer hover:border-emerald-500' : ''} ${addr.isDefault ? 'border-emerald-600 bg-emerald-50' : 'bg-white'}" 
                 ${isCheckoutPage ? `onclick="window.selectAddress('${addr.id}')"` : ''}
                 id="address-card-${addr.id}">
                
                ${addr.isDefault ? `<span class="absolute top-2 right-2 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">Varsayılan</span>` : ''}
                
                <h4 class="font-semibold text-gray-800">${addr.title}</h4>
                <p class="text-sm text-gray-600">${addr.name}</p>
                <p class="text-sm text-gray-600">${addr.line1}</p>
                <p class="text-sm text-gray-600">${addr.city}, ${addr.zip}</p>
                <p class="text-sm text-gray-600">Tel: ${addr.phone}</p>
                
                ${!isCheckoutPage ? `
                    <div class="mt-4 pt-2 border-t flex space-x-2">
                        <button class="text-xs text-red-500 hover:underline" onclick="window.handleDeleteAddress('${addr.id}')">Sil</button>
                    </div>
                ` : ''}
            </div>
        `;
        listContainer.innerHTML += cardHtml;
    });
}


// === 7. SEPET (localStorage) FONKSİYONLARI ===

export function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

export function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

export function addToCart(productId, product) {
    const cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += 1;
    } else {
        // Ürün objesinin tamamını (resimler dahil) sakla
        cart.push({ ...product, id: productId, quantity: 1 });
    }
    saveCart(cart);
    showModal("Başarılı!", `${product.name} sepete eklendi.`);
}

export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    loadCartPage(); // Sepet sayfasını yeniden yükle
}

export function updateCartQuantity(productId, quantity) {
    let cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        if (quantity <= 0) {
            cart = cart.filter(item => item.id !== productId); // 0 veya daha azsa kaldır
        } else {
            cart[existingProductIndex].quantity = quantity;
        }
        saveCart(cart);
        loadCartPage(); // Sepet sayfasını yeniden yükle
        loadCheckoutPage(); // Checkout'u da güncelle (eğer o sayfadaysa)
    }
}

export function getCartTotalPrice() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const price = (item.price || 0) * (1 - (item.discount || 0) / 100);
        return total + (price * item.quantity);
    }, 0);
}

export function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Hem masaüstü hem mobil için
    const countDesktop = document.getElementById('cart-badge-desktop');
    const countMobile = document.getElementById('cart-badge-mobile');
    
    if (countDesktop) countDesktop.textContent = count;
    if (countMobile) countMobile.textContent = count;
    
    if(count > 0) {
        if (countDesktop) countDesktop.classList.remove('hidden');
        if (countMobile) countMobile.classList.remove('hidden');
    } else {
        if (countDesktop) countDesktop.classList.add('hidden');
        if (countMobile) countMobile.classList.add('hidden');
    }
}


// === 8. ÜRÜN LİSTELEME FONKSİYONLARI ===

/**
 * Ürünler için standart HTML kart yapısı oluşturur.
 */
export function createProductCard(product, productId) {
    const price = (product.price || 0);
    const discount = (product.discount || 0);
    const discountedPrice = price * (1 - discount / 100);

    return `
        <div class="product-card border border-gray-200 shadow-sm hover:shadow-xl relative overflow-hidden">
            ${discount > 0 ? `<div class="sale-badge discount-badge">%${discount}</div>` : ''}
            
            <a href="./product.html?id=${productId}" class="block product-image-container">
                <img src="${product.images[0] || 'https://placehold.co/400x300/eee/ccc?text=Gorsel+Yok'}" 
                     alt="${product.name}" 
                     class="w-full h-56 object-cover"
                     onerror="this.src='https://placehold.co/400x300/eee/ccc?text=Gorsel+Hata'">
            </a>
            
            <div class="p-5">
                <p class="text-sm text-gray-500 mb-1">${product.category}</p>
                <h3 class="text-lg font-bold text-gray-900 truncate mb-3">${product.name}</h3>
                
                <div class="flex items-baseline justify-between mb-4">
                    ${discount > 0 ? `
                        <div>
                            <span class="text-2xl font-black text-emerald-600">${discountedPrice.toFixed(2)} TL</span>
                            <span class="text-md text-gray-500 price-slash ml-2">${price.toFixed(2)} TL</span>
                        </div>
                    ` : `
                        <span class="text-2xl font-black text-emerald-600">${price.toFixed(2)} TL</span>
                    `}
                </div>
                
                <button onclick="window.handleAddToCart('${productId}', {name: '${product.name.replace(/'/g, "\\'")}', price: ${price}, discount: ${discount}, images: ['${product.images[0] || ''}']})" 
                        class="w-full btn-primary text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 text-sm">
                    Sepete Ekle
                </button>
            </div>
            
            <div class="product-hover-info">
                 <a href="./product.html?id=${productId}" class="w-full bg-gray-800 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 text-sm text-center block">
                    Detayları Gör
                </a>
            </div>
        </div>
    `;
}
// Sepete Ekle butonunu global scope'a ekle
window.handleAddToCart = (productId, product) => {
    addToCart(productId, product);
};


/**
 * Ana Sayfa (Öne Çıkan Ürünler) yükler.
 */
export async function $loadFeaturedProducts() {
    const featuredProductsList = document.getElementById('featured-products-list');
    if (!featuredProductsList) return;
    
    featuredProductsList.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-sm text-center text-gray-600 col-span-full pulse-animation"><div class="loading-spinner mb-4"></div><p>Öne çıkan ürünler yükleniyor...</p></div>`;

    try {
        const q = query(productsCollection); // Normalde burada limit(4) ve where('isFeatured', '==', true) kullanılır
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            featuredProductsList.innerHTML = '<div class="col-span-full text-center text-gray-600">Henüz öne çıkan ürün bulunmamaktadır.</div>';
            return;
        }

        let productsHtml = '';
        querySnapshot.docs.slice(0, 4).forEach(doc => { // İlk 4 ürünü al
            productsHtml += createProductCard(doc.data(), doc.id);
        });
        featuredProductsList.innerHTML = productsHtml;

    } catch (error) {
        console.error("Öne çıkan ürünler yüklenirken hata:", error);
        featuredProductsList.innerHTML = `<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Ürünler yüklenirken bir sorun oluştu.</span></div>`;
    }
}

/**
 * Ürünler Sayfasını (Filtreli) yükler.
 */
export async function loadProductsPage(category) {
    const productList = document.getElementById('products-list');
    if (!productList) return;
    
    productList.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-sm text-center text-gray-600 col-span-full pulse-animation"><div class="loading-spinner mb-4"></div><p>Ürünler yükleniyor...</p></div>`;

    try {
        let q;
        if (category) {
            // Kategoriye göre filtrele
            q = query(productsCollection, where("category", "==", category));
        } else {
            // Tüm ürünleri getir
            q = query(productsCollection);
        }
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            productList.innerHTML = `<div class="col-span-full text-center text-gray-600 p-8 bg-white rounded-xl shadow-sm">Bu kategoride ürün bulunmamaktadır.</div>`;
            return;
        }

        let productsHtml = '';
        querySnapshot.forEach(doc => {
            productsHtml += createProductCard(doc.data(), doc.id);
        });
        productList.innerHTML = productsHtml;

    } catch (error) {
        console.error("Ürünler yüklenirken hata:", error);
        productList.innerHTML = `<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Ürünler yüklenirken bir sorun oluştu.</span></div>`;
    }
}

/**
 * Ürün Detay Sayfasını yükler.
 */
export async function loadProductDetails(productId) {
    const contentDiv = document.getElementById('product-detail-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-sm text-center text-gray-600 col-span-full pulse-animation"><div class="loading-spinner mb-4"></div><p>Ürün detayı yükleniyor...</p></div>`;

    try {
        const docRef = doc(productsCollection, productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            contentDiv.innerHTML = '<div class="col-span-full text-center text-red-500 p-8 bg-white rounded-xl shadow-sm">Ürün bulunamadı.</div>';
            return;
        }

        const product = docSnap.data();
        const price = (product.price || 0);
        const discount = (product.discount || 0);
        const discountedPrice = price * (1 - discount / 100);

        // Resim galerisi oluştur
        let mainImageHtml = `<img id="main-product-image" src="${product.images[0] || 'https://placehold.co/600x600'}" alt="${product.name}" class="w-full h-auto object-cover rounded-xl border border-gray-200" onerror="this.src='https://placehold.co/600x600/eee/ccc?text=Gorsel+Hata'">`;
        let thumbImagesHtml = '';

        if (product.images && product.images.length > 1) {
            product.images.forEach(imgUrl => {
                thumbImagesHtml += `
                    <img src="${imgUrl}" 
                         alt="thumbnail" 
                         class="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-emerald-500 transition-all duration-200"
                         onclick="document.getElementById('main-product-image').src='${imgUrl}'">
                `;
            });
        }

        const html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                    ${mainImageHtml}
                    <div class="flex space-x-2 overflow-x-auto mt-4 p-1">
                        ${thumbImagesHtml}
                    </div>
                </div>
                
                <div>
                    <span class="text-sm text-gray-500 font-medium">${product.category}</span>
                    <h1 class="text-4xl font-black text-gray-900 mb-4 mt-2">${product.name}</h1>
                    <p class="text-gray-700 mb-6 leading-relaxed">${product.description}</p>
                    
                    <div class="mb-6">
                        ${discount > 0 ? `
                            <div class="flex items-baseline space-x-3">
                                <span class="text-5xl font-black text-emerald-600">${discountedPrice.toFixed(2)} TL</span>
                                <span class="text-2xl text-gray-500 price-slash">${price.toFixed(2)} TL</span>
                            </div>
                            <span class="mt-2 inline-block bg-red-100 text-red-600 text-sm font-medium px-3 py-1 rounded-full">%${discount} İndirim</span>
                        ` : `
                            <span class="text-5xl font-black text-emerald-600">${price.toFixed(2)} TL</span>
                        `}
                    </div>
                    
                    <button id="add-to-cart-button" class="w-full btn-primary text-white py-4 px-6 rounded-lg text-lg font-bold transition-all duration-300 transform hover:scale-105">
                        <i class="fas fa-shopping-bag mr-2"></i> Sepete Ekle
                    </button>
                </div>
            </div>
        `;
        contentDiv.innerHTML = html;

        // Sepete Ekle butonuna olay dinleyici ekle
        document.getElementById('add-to-cart-button').addEventListener('click', () => {
            addToCart(productId, product);
        });

    } catch (error) {
        console.error("Ürün detayı yüklenirken hata:", error);
        contentDiv.innerHTML = '<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Ürün detayı yüklenemedi.</span></div>';
    }
}


// === 9. SEPET VE SİPARİŞ (CHECKOUT) ===

/**
 * Sepet Sayfasını yükler.
 */
export function loadCartPage() {
    const cart = getCart();
    const itemsDiv = document.getElementById('cart-items-container');
    const summaryDiv = document.getElementById('cart-summary');
    
    if (!itemsDiv || !summaryDiv) return; // Sepet sayfasında değilsek çık

    if (cart.length === 0) {
        itemsDiv.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow border text-center">
                <i class="fas fa-shopping-cart text-5xl text-gray-300 mb-4"></i>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Sepetiniz Boş</h2>
                <p class="text-gray-500 mb-6">Görünüşe göre henüz bir şey eklememişsiniz.</p>
                <a href="./products.html" class="btn-primary text-white px-6 py-3 rounded-lg font-bold">
                    Alışverişe Başla
                </a>
            </div>
        `;
        summaryDiv.classList.add('hidden');
        return;
    }

    summaryDiv.classList.remove('hidden');
    let html = '';
    
    cart.forEach(item => {
        const price = (item.price || 0);
        const discount = (item.discount || 0);
        const discountedPrice = price * (1 - discount / 100);
        const itemTotal = discountedPrice * item.quantity;
        
        html += `
            <div class="flex items-center justify-between py-6 border-b">
                <div class="flex items-center space-x-4">
                    <img src="${item.images[0] || 'https://placehold.co/100x100'}" alt="${item.name}" class="w-24 h-24 object-cover rounded-lg border">
                    <div>
                        <a href="./product.html?id=${item.id}" class="text-lg font-bold text-gray-800 hover:text-emerald-600">${item.name}</a>
                        <p class="text-sm text-gray-500">${discountedPrice.toFixed(2)} TL ${discount > 0 ? `(%${discount} indirim)` : ''}</p>
                        <button class="text-sm text-red-500 hover:underline mt-1" onclick="window.handleRemoveFromCart('${item.id}')">
                            <i class="fas fa-trash-alt mr-1"></i> Kaldır
                        </button>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <input type="number" value="${item.quantity}" min="1" class="w-20 text-center border rounded-lg p-2" 
                           onchange="window.handleUpdateCartQuantity('${item.id}', this.valueAsNumber)">
                    <span class="font-bold text-lg w-28 text-right">${itemTotal.toFixed(2)} TL</span>
                </div>
            </div>
        `;
    });
    
    itemsDiv.innerHTML = html;
    
    // Özeti güncelle
    const totalPrice = getCartTotalPrice();
    document.getElementById('summary-subtotal').textContent = `${totalPrice.toFixed(2)} TL`;
    document.getElementById('summary-total').textContent = `${totalPrice.toFixed(2)} TL`;
    
    // Fonksiyonları global scope'a ekle
    window.handleRemoveFromCart = removeFromCart;
    window.handleUpdateCartQuantity = updateCartQuantity;
}

/**
 * Sipariş Onay (Checkout) Sayfasını yükler.
 */
export function loadCheckoutPage() {
    if (!currentUser) {
        showModal("Giriş Gerekli", "Sipariş vermek için lütfen giriş yapın.", "error");
        setTimeout(() => window.location.href = './auth.html', 1500);
        return;
    }

    const cart = getCart();
    const itemsDiv = document.getElementById('checkout-items');
    const totalSpan = document.getElementById('checkout-total');
    const confirmButton = document.getElementById('confirm-order-button');
    
    if (!itemsDiv) return; // Checkout sayfasında değilsek çık

    if (cart.length === 0) {
        itemsDiv.innerHTML = '<p class="text-gray-500">Sepetinizde ürün bulunmuyor.</p>';
        totalSpan.textContent = '0.00 TL';
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
        return;
    }
    
    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    let html = '';
    cart.forEach(item => {
        const discountedPrice = (item.price || 0) * (1 - (item.discount || 0) / 100);
        const itemTotal = discountedPrice * item.quantity;
        html += `
            <div class="flex justify-between py-3 border-b">
                <span class="text-gray-700">${item.name} (x${item.quantity})</span>
                <span class="font-medium">${itemTotal.toFixed(2)} TL</span>
            </div>
        `;
    });
    itemsDiv.innerHTML = html;
    
    const totalPrice = getCartTotalPrice();
    totalSpan.textContent = `${totalPrice.toFixed(2)} TL`;

    // Adres listesini yükle
    renderAddressList('checkout-address-list');
}

/**
 * Sipariş oluşturur (Firestore'a yazar).
 */
export async function createOrder(paymentMethod, selectedAddressId) {
    if (!currentUser) throw new Error("Giriş yapılmamış.");
    if (!selectedAddressId) throw new Error("Lütfen bir teslimat adresi seçin.");
    
    const cart = getCart();
    if (cart.length === 0) throw new Error("Sepetiniz boş.");
    
    const selectedAddress = currentUser.addresses.find(addr => addr.id === selectedAddressId);
    if (!selectedAddress) throw new Error("Seçilen adres geçersiz.");
    
    const totalPrice = getCartTotalPrice();

    try {
        await addDoc(ordersCollection, {
            userId: currentUser.auth.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            items: cart,
            totalPrice: totalPrice,
            paymentMethod: paymentMethod, // 'Kredi Kartı / Havale' veya 'Kapıda Ödeme'
            shippingAddress: selectedAddress, // Adres objesinin tamamını kaydet
            status: "Beklemede", // Varsayılan durum
            date: Timestamp.now(),
            paymentLink: "" // Adminin doldurması için boş link
        });

        // Başarılı sipariş
        localStorage.removeItem('cart'); // Sepeti temizle
        updateCartCount();
        
    } catch (error) {
        console.error("Sipariş oluşturma hatası:", error);
        throw new Error("Siparişiniz oluşturulurken bir hata oluştu: " + error.message);
    }
}


// === 10. SİPARİŞLERİM (Müşterin) ===

/**
 * Müşterinin kendi siparişlerini yükler.
 */
export async function loadMyOrders() {
    if (!currentUser) {
        window.location.href = './auth.html';
        return;
    }
    
    const ordersListEl = document.getElementById('my-orders-list');
    if (!ordersListEl) return;
    
    ordersListEl.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-sm text-center text-gray-600 col-span-full pulse-animation"><div class="loading-spinner mb-4"></div><p>Siparişleriniz yükleniyor...</p></div>`;

    try {
        // Kullanıcının kendi siparişlerini çek (userId'ye göre)
        const q = query(ordersCollection, where("userId", "==", currentUser.auth.uid));
        
        // onSnapshot ile canlı dinle (admin durumu güncellediğinde anında yansıması için)
        onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) {
                ordersListEl.innerHTML = `
                    <div class="bg-white p-8 rounded-xl shadow border text-center col-span-full">
                        <i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Henüz Siparişiniz Yok</h2>
                        <p class="text-gray-500 mb-6">İlk siparişinizi vermek için sabırsızlanıyoruz.</p>
                        <a href="./products.html" class="btn-primary text-white px-6 py-3 rounded-lg font-bold">
                            Alışverişe Başla
                        </a>
                    </div>
                `;
                return;
            }

            ordersListEl.innerHTML = ''; // Temizle
            
            querySnapshot.forEach((doc) => {
                const order = doc.data();
                const orderId = doc.id;
                const orderDate = order.date.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                
                // Sipariş durumu için renk belirle
                let statusColor = 'bg-gray-200 text-gray-800';
                if (order.status === 'Beklemede') statusColor = 'bg-yellow-100 text-yellow-800';
                if (order.status === 'Hazırlanıyor') statusColor = 'bg-blue-100 text-blue-800';
                if (order.status === 'Kargoda') statusColor = 'bg-indigo-100 text-indigo-800';
                if (order.status === 'Teslim Edildi') statusColor = 'bg-green-100 text-green-800';
                
                // Ödeme linki butonu
                let paymentButtonHtml = '';
                if (order.paymentMethod === 'Kredi Kartı / Havale' && order.status === 'Beklemede' && order.paymentLink) {
                    paymentButtonHtml = `
                        <a href="${order.paymentLink}" target="_blank" class="mt-4 inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                            Şimdi Öde <i class="fas fa-external-link-alt ml-1"></i>
                        </a>
                    `;
                } else if (order.paymentMethod === 'Kredi Kartı / Havale' && order.status === 'Beklemede' && !order.paymentLink) {
                     paymentButtonHtml = `
                        <p class="mt-4 text-sm text-yellow-700 font-medium">Ödeme linkiniz bekleniyor. Lütfen yönetici ile iletişime geçin.</p>
                    `;
                }

                const orderCard = `
                    <div class="bg-white p-6 rounded-xl shadow-lg border animate-fadeInUp">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900">Sipariş ID: <span class="text-emerald-600">${orderId.substring(0, 10)}...</span></h3>
                                <p class="text-gray-600 text-sm mt-1">Tarih: ${orderDate}</p>
                            </div>
                            <span class_="${statusColor} px-3 py-1 text-sm font-bold rounded-full mt-2 sm:mt-0">${order.status}</span>
                        </div>
                        
                        <div class="my-4 space-y-3">
                            ${order.items.map(item => `
                                <div class="flex items-center space-x-3">
                                    <img src="${item.images[0] || 'https://placehold.co/50x50'}" alt="${item.name}" class="w-14 h-14 object-cover rounded-md border">
                                    <div>
                                        <p class="font-semibold text-gray-800">${item.name}</p>
                                        <p class="text-sm text-gray-500">${item.quantity} adet</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="border-t pt-4 space-y-3">
                            <div>
                                <h4 class="font-semibold text-gray-700">Teslimat Adresi</h4>
                                <p class="text-sm text-gray-600">${order.shippingAddress.name}, ${order.shippingAddress.line1}, ${order.shippingAddress.city}</p>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-700">Ödeme Yöntemi</h4>
                                <p class="text-sm text-gray-600">${order.paymentMethod}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xl font-black text-gray-900">Toplam: <span class="text-emerald-600">${order.totalPrice.toFixed(2)} TL</span></p>
                                ${paymentButtonHtml}
                            </div>
                        </div>
                    </div>
                `;
                ordersListEl.innerHTML += orderCard;
            });

        }, (error) => {
            console.error("Siparişlerim yüklenirken hata:", error);
            ordersListEl.innerHTML = `<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Siparişler yüklenemedi.</span></div>`;
        });

    } catch (error) {
        console.error("Siparişlerim sorgulanırken hata:", error);
        ordersListEl.innerHTML = `<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Siparişler yüklenemedi.</span></div>`;
    }
}


// === 11. ADMİN PANELİ FONKSİYONLARI ===

/**
 * Admin Paneli için siparişleri dinler ve listeler.
 */
export function listenForOrders() {
    const orderListDiv = document.getElementById('admin-order-list');
    if (!orderListDiv) return;

    orderListDiv.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-sm text-center text-gray-600 col-span-full pulse-animation"><div class="loading-spinner mb-4"></div><p>Siparişler yükleniyor...</p></div>`;

    const q = query(ordersCollection); // Tüm siparişleri çek
    
    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            orderListDiv.innerHTML = '<p class="text-gray-500 text-center col-span-full">Henüz sipariş yok.</p>';
            return;
        }
        
        orderListDiv.innerHTML = ''; // Temizle
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const orderId = doc.id;
            
            // Sipariş durumu için renk belirle
            let statusColor = 'bg-gray-200 text-gray-800';
            if (order.status === 'Beklemede') statusColor = 'bg-yellow-100 text-yellow-800';
            if (order.status === 'Hazırlanıyor') statusColor = 'bg-blue-100 text-blue-800';
            if (order.status === 'Kargoda') statusColor = 'bg-indigo-100 text-indigo-800';
            if (order.status === 'Teslim Edildi') statusColor = 'bg-green-100 text-green-800';

            // WhatsApp mesajı hazırla
            const whatsappMessage = encodeURIComponent(
`Merhaba ${order.userName}, PAFA TEAMSPORT'tan verdiğiniz ${orderId.substring(0, 6)} ID'li siparişiniz hakkında:
...`
            );
            const whatsappLink = `https://wa.me/${order.shippingAddress.phone.replace(/\D/g, '')}?text=${whatsappMessage}`;

            // Ödeme linki alanı
            let paymentLinkHtml = '';
            if (order.paymentMethod === 'Kredi Kartı / Havale') {
                paymentLinkHtml = `
                    <div class="mt-4 pt-4 border-t">
                        <label class="block text-sm font-medium text-gray-700">Ödeme Linki</label>
                        <input type="text" id="payment-link-${orderId}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" value="${order.paymentLink || ''}" placeholder="https://odeme.linki.com/...">
                        <button class="mt-2 w-full text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700" onclick="window.handleSavePaymentLink('${orderId}')">Linki Kaydet/Gönder</button>
                    </div>
                `;
            }

            const orderCard = `
                <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-200 animate-fadeInUp">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b">
                        <div>
                            <h3 class="text-base font-bold text-gray-900">ID: <span class="text-emerald-600">${orderId}</span></h3>
                            <p class="text-gray-600 text-xs mt-1">Müşteri: ${order.userName} (${order.userEmail})</p>
                            <p class="text-gray-600 text-xs mt-1">Tarih: ${order.date.toDate().toLocaleString('tr-TR')}</p>
                        </div>
                        <span class="${statusColor} px-3 py-1 text-sm font-bold rounded-full mt-2 sm:mt-0">${order.status}</span>
                    </div>
                    
                    <div class="py-4">
                        <button class="text-sm font-medium text-emerald-600 hover:underline" onclick="document.getElementById('details-${orderId}').classList.toggle('hidden')">
                            Detayları Göster/Gizle
                        </button>
                        <div id="details-${orderId}" class="hidden mt-4 space-y-4">
                            <ul class="space-y-2">
                                ${order.items.map(item => `
                                    <li class="flex items-center space-x-2 text-sm">
                                        <img src="${item.images[0] || 'https://placehold.co/50x50'}" alt="${item.name}" class="w-10 h-10 object-cover rounded border">
                                        <span>${item.name} (x${item.quantity})</span>
                                        <span class="font-medium">${((item.price * (1 - (item.discount || 0) / 100)) * item.quantity).toFixed(2)} TL</span>
                                    </li>
                                `).join('')}
                            </ul>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div class="bg-gray-50 p-3 rounded-md">
                                    <h4 class="font-semibold text-gray-700">Teslimat Adresi</h4>
                                    <p class="text-gray-600">${order.shippingAddress.name}</p>
                                    <p class="text-gray-600">${order.shippingAddress.line1}, ${order.shippingAddress.city}</p>
                                    <p class="text-gray-600">Tel: ${order.shippingAddress.phone}</p>
                                </div>
                                <div class="bg-gray-50 p-3 rounded-md">
                                    <h4 class="font-semibold text-gray-700">Ödeme Yöntemi</h4>
                                    <p class="text-gray-600">${order.paymentMethod}</p>
                                    <h4 class="font-semibold text-gray-700 mt-2">Toplam Tutar</h4>
                                    <p class="font-bold text-lg text-emerald-600">${order.totalPrice.toFixed(2)} TL</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t pt-4 space-y-3">
                        <div class="flex items-center space-x-2">
                            <select id="status-select-${orderId}" class="flex-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
                                <option value="Beklemede" ${order.status === 'Beklemede' ? 'selected' : ''}>Beklemede</option>
                                <option value="Hazırlanıyor" ${order.status === 'Hazırlanıyor' ? 'selected' : ''}>Hazırlanıyor</option>
                                <option value="Kargoda" ${order.status === 'Kargoda' ? 'selected' : ''}>Kargoda</option>
                                <option value="Teslim Edildi" ${order.status === 'Teslim Edildi' ? 'selected' : ''}>Teslim Edildi</option>
                            </select>
                            <button class="text-sm bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700" onclick="window.handleUpdateStatus('${orderId}')">Güncelle</button>
                        </div>
                        
                        <a href="${whatsappLink}" target="_blank" class="block w-full text-center text-sm bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600">
                            <i class="fab fa-whatsapp mr-1"></i> WhatsApp ile İletişime Geç
                        </a>
                        
                        ${paymentLinkHtml}
                    </div>
                </div>
            `;
            orderListDiv.innerHTML += orderCard;
        });

    }, (error) => {
        console.error("Admin siparişleri dinleme hatası:", error);
        orderListDiv.innerHTML = `<div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert"><strong class="font-bold">Hata!</strong><span class="block sm:inline">Siparişler yüklenemedi.</span></div>`;
    });
}

/**
 * Admin: Sipariş durumunu günceller.
 */
window.handleUpdateStatus = async (orderId) => {
    const selectEl = document.getElementById(`status-select-${orderId}`);
    const newStatus = selectEl.value;
    
    try {
        const orderDocRef = doc(ordersCollection, orderId);
        await updateDoc(orderDocRef, {
            status: newStatus
        });
        showModal("Başarılı", `Sipariş durumu "${newStatus}" olarak güncellendi.`);
    } catch (error) {
        console.error("Sipariş durumu güncellenirken hata:", error);
        showModal("Hata", "Durum güncellenemedi: " + error.message, 'error');
    }
}

/**
 * Admin: Ödeme linkini kaydeder.
 */
window.handleSavePaymentLink = async (orderId) => {
    const inputEl = document.getElementById(`payment-link-${orderId}`);
    const newLink = inputEl.value;
    
    try {
        const orderDocRef = doc(ordersCollection, orderId);
        await updateDoc(orderDocRef, {
            paymentLink: newLink
        });
        showModal("Başarılı", `Ödeme linki kaydedildi.`);
    } catch (error) {
        console.error("Ödeme linki kaydedilirken hata:", error);
        showModal("Hata", "Link kaydedilemedi: " + error.message, 'error');
    }
}


/**
 * Admin: Yeni ürün ekler.
 */
export async function addProduct(productData) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        throw new Error("Yetkisiz işlem.");
    }
    
    try {
        await addDoc(productsCollection, productData);
    } catch (error) {
        console.error("Ürün ekleme hatası:", error);
        throw new Error("Ürün eklenemedi: " + error.message);
    }
}

/**
 * Admin: Ürün siler.
 */
export async function deleteProduct(productId) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        throw new Error("Yetkisiz işlem.");
    }
    
    try {
        const productDocRef = doc(productsCollection, productId);
        await deleteDoc(productDocRef);
    } catch (error) {
        console.error("Ürün silme hatası:", error);
        throw new Error("Ürün silinemedi: " + error.message);
    }
}


// === 12. Diğer Global Atamalar (HTML onclickleri için) ===
// Bu fonksiyonlar zaten 'window.' scope'unda tanımlandı:
// - closeModal
// - handleAddToCart
// - handleRemoveFromCart
// - handleUpdateCartQuantity
// - handleUpdateStatus
// - handleSavePaymentLink
// - handleDeleteAddress (account.html'den çağrılacak)
// - selectAddress (checkout.html'den çağrılacak)

// Gerekli export'lar (HTML dosyalarındaki <script type="module"> için)
export { 
    auth, db, 
    // currentUser, // Zaten üstte export edildi
    // isAuthReady, // Zaten üstte export edildi
    // productsCollection, // Zaten üstte export edildi
    // Fonksiyonlar
    $loadFeaturedProducts, // Yeni isim
    $startCountdown, // Yeni export
    getDocs, query, where, doc, getDoc, 
    updateDoc, deleteDoc, addDoc, setDoc, Timestamp,
    arrayUnion, arrayRemove
};
