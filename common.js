/**
 * Ortak JavaScript Mantığı: Firebase Bağlantısı, Sepet Fonksiyonları, Kimlik Doğrulama ve Ortak UI İşlemleri.
 * YENİ PAFA TEAMSPORT TASARIMINA (Mega Menü, Yeni Stiller, Sayaç) göre güncellendi.
 * Tüm HTML sayfaları tarafından import edilir.
 */

// === 0. FIREBASE SDK IMPORTS ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    collection,
    query,
    getDocs,
    Timestamp,
    getDoc,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// === 1. KURULUM VE GENEL DEĞİŞKENLER ===

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

export { getDocs, query, where, onSnapshot, Timestamp, getDoc, doc, setDoc, addDoc, deleteDoc, collection };

const ADMIN_EMAIL = 'admin@e-ticaret.com';

let app, auth, db;
export let currentUser = null;
export let isAuthReady = false;

export let productsCollection, ordersCollection, usersCollection;

export const CATEGORIES = [
    { value: 'all', label: 'Tüm Ürünler' },
    { value: 'forma', label: 'Formalar' },
    { value: 'ayakkabi', label: 'Ayakkabılar' },
    { value: 'aksesuar', label: 'Aksesuarlar' },
    { value: 'top', label: 'Toplar' }
];

try {
    app = initializeApp(firebaseConfig);
    getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);

    productsCollection = collection(db, "products");
    ordersCollection = collection(db, "orders");
    usersCollection = collection(db, "users");

} catch (error) {
    console.error("Firebase başlatma hatası:", error);
}

// === 2. MODAL (BİLDİRİM) FONKSİYONLARI ===

export function showModal(title, message) {
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    if (modal && modalTitle && modalMessage) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.remove('hidden');
    } else {
        console.warn(`Modal UI not found. Message: ${title} - ${message}`);
    }
}

export function closeModal() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
window.closeModal = closeModal;


// === 3. SEPET (localStorage) FONKSİYONLARI ===

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
        // Yeni ürünü eklerken, sadece gerekli alanları al
        const { name, price, description, images, category, discount } = product;
        cart.push({ id: productId, name, price, description, images, category, discount, quantity: 1 });
    }
    saveCart(cart);
    showModal("Sepete Eklendi", `${product.name} sepete eklendi!`);
}

export function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
}

export function updateCartQuantity(productId, quantity) {
    let cart = getCart();
    const existingProductIndex = cart.findIndex(item => item.id === productId);

    if (existingProductIndex > -1) {
        if (quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        } else {
            cart[existingProductIndex].quantity = quantity;
        }
        saveCart(cart);
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
    
    // Yeni tasarımdaki tüm .cart-badge-count öğelerini güncelle
    document.querySelectorAll('.cart-badge-count').forEach(el => {
        if (count > 0) {
            el.textContent = count;
            el.classList.remove('hidden');
        } else {
            el.textContent = '0';
            el.classList.add('hidden');
        }
    });
}

// === 4. OPTİMİZASYON: HEADER/FOOTER YÜKLEYİCİ VE STİL ===

export async function loadHeaderAndFooter(currentPageId) {
    // Önce Auth durumunun bitmesini bekliyoruz (Race Condition'ı çözer)
    await initAuthAndNav();
    
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    try {
        const [headerRes, footerRes] = await Promise.all([
            fetch('./_header.html'),
            fetch('./_footer.html')
        ]);

        if (!headerRes.ok || !footerRes.ok) {
            throw new Error("Header/Footer yüklenemedi.");
        }

        const headerHtml = await headerRes.text();
        const footerHtml = await footerRes.text();

        if (headerPlaceholder) headerPlaceholder.innerHTML = headerHtml;
        if (footerPlaceholder) footerPlaceholder.innerHTML = footerHtml;

        // --- Header/Footer yüklendikten SONRA çalışması gereken JS'ler ---
        
        // 1. Gerekli CSS/Fontları enjekte et (Yeni Ana Sayfadan Alınan Stiller)
        injectGlobalStyles();
        
        // 2. Auth durumuna göre UI'ı güncelle
        updateNavAndAuthUI(currentPageId);
        
        // 3. Yeni Header'ın interaktif öğelerini çalıştır
        setupHeaderInteractivity();

    } catch (error) {
        console.error("Header/Footer yükleme hatası:", error);
        if (headerPlaceholder) headerPlaceholder.innerHTML = "<p class='text-center text-red-500'>Menü yüklenemedi.</p>";
        if (footerPlaceholder) footerPlaceholder.innerHTML = "<p class='text-center text-red-500'>Alt bilgi yüklenemedi.</p>";
    }
}

/**
 * Yeni header'daki (mobil menü, mega menü) interaktif öğeleri ayarlar
 */
function setupHeaderInteractivity() {
    // Mobil Menu Toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const closeMobileMenuButton = document.getElementById('close-mobile-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.add('open');
        });
    }
    if (closeMobileMenuButton && mobileMenu) {
        closeMobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    }
    
    // Mobil menü linklerine tıklayınca menüyü kapat
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    });

    // Mega Menu Fonksiyonu
    const productsMenuTrigger = document.getElementById('products-menu-trigger');
    const megaMenu = document.getElementById('mega-menu');
    
    if (productsMenuTrigger && megaMenu) {
        productsMenuTrigger.addEventListener('mouseenter', () => {
            megaMenu.classList.add('active');
        });
        
        productsMenuTrigger.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!megaMenu.matches(':hover')) {
                    megaMenu.classList.remove('active');
                }
            }, 100);
        });
        
        megaMenu.addEventListener('mouseleave', () => {
            megaMenu.classList.remove('active');
        });
    }
}


/**
 * Navigasyonu ve kullanıcı durumunu günceller.
 */
function updateNavAndAuthUI(currentPageId) {
    // === Ortak Elemanlar ===
    const logoutHandler = async () => {
        try {
            await signOut(auth);
            showModal("Başarılı", "Çıkış yapıldı.");
            // auth.html'e yönlendir, bu sayede oradan tekrar index'e yönlendirilebilir.
            window.location.href = './index.html'; 
        } catch (error) {
            showModal("Hata", "Çıkış yapılamadı: " + error.message);
        }
    };
    
    // === Masaüstü Auth Linkleri ===
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');
    const adminLink = document.getElementById('admin-link');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    
    // === Mobil Auth Linkleri ===
    const mobileAuthLinks = document.getElementById('mobile-auth-links');
    const mobileUserLinks = document.getElementById('mobile-user-links');
    const mobileUserEmail = document.getElementById('mobile-user-email');
    const mobileLogoutButton = document.getElementById('mobile-logout-button');
    const mobileAdminLink = document.getElementById('mobile-admin-link');

    
    // Aktif linki vurgula (Masaüstü)
    document.querySelectorAll('.nav-link').forEach(a => {
        if (a.dataset.pageId === currentPageId) {
            a.classList.add('text-emerald-600', 'font-semibold', 'border-b-2', 'border-emerald-600');
        } else {
            a.classList.remove('text-emerald-600', 'font-semibold', 'border-b-2', 'border-emerald-600');
        }
    });
    
    // Aktif linki vurgula (Mobil)
    document.querySelectorAll('.mobile-nav-link').forEach(a => {
        if (a.dataset.pageId === currentPageId) {
            a.classList.add('text-emerald-600', 'font-semibold', 'border-l-4', 'border-emerald-600', 'bg-emerald-50');
        } else {
            a.classList.remove('text-emerald-600', 'font-semibold', 'border-l-4', 'border-emerald-600', 'bg-emerald-50');
        }
    });

    // Auth durumunu güncelle
    if (currentUser) {
        // Masaüstü UI
        if (authLinks) { authLinks.style.display = 'none'; }
        if (userLinks) { userLinks.style.display = 'flex'; }
        if (userEmailSpan) { userEmailSpan.textContent = currentUser.email; }

        // Mobil UI
        if (mobileAuthLinks) { mobileAuthLinks.style.display = 'none'; }
        if (mobileUserLinks) { mobileUserLinks.style.display = 'flex'; }
        if (mobileUserEmail) { mobileUserEmail.textContent = currentUser.email; }
        
        // Admin linkleri
        const isAdmin = currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL;
        if (isAdmin) {
            if (adminLink) { adminLink.classList.remove('hidden'); }
            if (mobileAdminLink) { mobileAdminLink.classList.remove('hidden'); }
        } else {
            if (adminLink) { adminLink.classList.add('hidden'); }
            if (mobileAdminLink) { mobileAdminLink.classList.add('hidden'); }
        }

        // Çıkış Butonları
        if (logoutButton) logoutButton.onclick = logoutHandler;
        if (mobileLogoutButton) mobileLogoutButton.onclick = logoutHandler;

    } else {
        // Masaüstü UI
        if (authLinks) { authLinks.style.display = 'flex'; }
        if (userLinks) { userLinks.style.display = 'none'; }
        
        // Mobil UI
        if (mobileAuthLinks) { mobileAuthLinks.style.display = 'flex'; }
        if (mobileUserLinks) { mobileUserLinks.style.display = 'none'; }

        // Admin linkleri
        if (adminLink) { adminLink.classList.add('hidden'); }
        if (mobileAdminLink) { mobileAdminLink.classList.add('hidden'); }
    }
    
    updateCartCount();
}


function injectGlobalStyles() {
    // Font Awesome CDN
    let fa = document.querySelector('link[href*="font-awesome"]');
    if (!fa) {
        fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }
    
    // Google Fonts (Inter)
    let gFonts = document.querySelector('link[href*="fonts.googleapis"]');
    if (!gFonts) {
        gFonts = document.createElement('link');
        gFonts.rel = 'stylesheet';
        gFonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
        document.head.appendChild(gFonts);
    }

    // Yeni tasarımın CSS değişkenleri ve stilleri
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        :root {
            --primary: #059669; /* emerald-600 */
            --primary-dark: #047857; /* emerald-700 */
            --primary-darker: #065f46; /* emerald-800 */
            --accent: #f59e0b; /* amber-500 */
            --light: #f8fafc; /* gray-50 */
            --dark: #1e293b; /* gray-800 */
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--light);
            color: #1e293b; 
            scroll-behavior: smooth;
        }
        
        .gradient-bg { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, var(--primary-darker) 100%); }
        .gradient-text {
            background: linear-gradient(90deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .btn-primary {
            background: linear-gradient(to right, var(--primary), var(--primary-dark));
            box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);
            transition: all 0.3s ease;
            color: white;
        }
        
        .btn-primary:hover {
            background: linear-gradient(to right, var(--primary-dark), var(--primary-darker));
            box-shadow: 0 10px 25px rgba(5, 150, 105, 0.5);
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            color: white;
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }
        
        .sale-badge {
            position: absolute; top: 12px; right: 12px;
            background: linear-gradient(45deg, #ef4444, #f59e0b);
            color: white; padding: 4px 10px; border-radius: 20px;
            font-size: 0.75rem; font-weight: 700; z-index: 10;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .sticky-header {
            position: sticky; top: 0; z-index: 100;
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }
        
        .mobile-menu {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            position: fixed; inset: 0; height: 100%; z-index: 101; 
        }
        .mobile-menu.open { transform: translateX(0); }
        
        .cart-badge {
            position: absolute; top: -8px; right: -8px;
            background: var(--accent); color: white;
            border-radius: 50%; width: 20px; height: 20px;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.75rem; font-weight: 700;
        }
        
        .mega-menu {
            opacity: 0; visibility: hidden; transform: translateY(-10px);
            transition: all 0.3s ease;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            position: absolute; left: 0; right: 0; z-index: 90; 
        }
        .mega-menu.active { opacity: 1; visibility: visible; transform: translateY(0); }
        .mega-menu-column h4 { font-weight: 600; color: var(--primary); margin-bottom: 12px; font-size: 1.1rem; }
        .mega-menu-column ul li { margin-bottom: 8px; }
        .mega-menu-column ul li a { color: #4b5563; transition: color 0.2s ease; }
        .mega-menu-column ul li a:hover { color: var(--primary); }
        
        .floating-animation { animation: floating 6s ease-in-out infinite; }
        @keyframes floating {
            0% { transform: translate(0, 0px) rotate(0deg); }
            50% { transform: translate(0, -20px) rotate(2deg); }
            100% { transform: translate(0, -0px) rotate(0deg); }
        }

        .pulse-animation { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .85; } }
        
        .loading-spinner {
            border: 3px solid rgba(5, 150, 105, 0.3);
            border-radius: 50%;
            border-top: 3px solid var(--primary);
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }

        .discount-tag {
            background: linear-gradient(45deg, #ef4444, #dc2626);
            transform: rotate(-5deg);
            box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
        }
        .price-slash { text-decoration: line-through; opacity: 0.7; }
        
        /* Eklenen scrollbar stili */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        
        /* Header Logo styles for dark background */
        .footer-logo {
            filter: brightness(0) invert(1);
        }
    `;
    document.head.appendChild(style);
}


// === 5. KİMLİK DOĞRULAMA ÇEKİRDEK İŞLEMLERİ (CORE AUTH) ===
// (Mantık aynı kalır)

export function initAuthAndNav() {
    return new Promise((resolve) => {
        if (isAuthReady) {
            // UI'ı sadece auth hazır olunca güncelliyoruz.
            updateNavAndAuthUI(document.body.getAttribute('data-page-id'));
            resolve();
            return;
        }
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(usersCollection, user.uid);
                const userDoc = await getDoc(userDocRef);
                currentUser = userDoc.exists() 
                    ? { auth: user, ...userDoc.data() } 
                    : { auth: user, email: user.email, role: 'customer' };
            } else {
                currentUser = null;
            }

            isAuthReady = true;
            unsubscribe();
            // Auth tamamlandığı anda UI'ı güncelle
            updateNavAndAuthUI(document.body.getAttribute('data-page-id'));
            resolve();
        });
    });
}

export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const isAdmin = (email.toLowerCase() === ADMIN_EMAIL);

        await setDoc(doc(usersCollection, user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: isAdmin ? "admin" : "customer"
        });
        return true;
    } catch (error) {
        console.error("Kayıt hatası:", error);
        throw error;
    }
}

export async function signInUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch (error) {
        console.error("Giriş hatası:", error);
        throw error;
    }
}


// === 6. FIREBASE VERİ İŞLEMLERİ ===
// (Mantık ve createProductCard güncellendi)

export function createProductCard(product, productId) {
    const price = (product.price || 0);
    const discount = (product.discount || 0);
    const discountedPrice = price * (1 - (discount / 100));

    return `
        <div class="product-card bg-white shadow-lg hover:shadow-2xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 group rounded-xl">
            <div class="product-image-container relative">
                <a href="./product.html?id=${productId}">
                    <img src="${product.images[0] || 'https://placehold.co/400x300/e0f2f1/047857?text=PAFA'}" 
                         alt="${product.name}" 
                         class="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                         onerror="this.src='https://placehold.co/400x300/e0f2f1/047857?text=HATA'">
                </a>
                ${discount > 0 ? `<div class="sale-badge">%${discount} İNDİRİM</div>` : ''}
            </div>
            <div class="p-5">
                <p class="text-sm text-gray-500 mb-1 capitalize">${product.category}</p>
                <h3 class="text-lg font-bold text-gray-900 mb-3 truncate" title="${product.name}">${product.name}</h3>
                
                <div class="flex items-baseline justify-between mb-4">
                    ${discount > 0 ? `
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-extrabold text-red-600">${discountedPrice.toFixed(2)} TL</span>
                            <span class="text-lg text-gray-500 price-slash">${price.toFixed(2)} TL</span>
                        </div>
                    ` : `
                        <span class="text-2xl font-extrabold text-emerald-600">${price.toFixed(2)} TL</span>
                    `}
                </div>
                
                <a href="./product.html?id=${productId}" class="block w-full text-center btn-primary text-white py-2.5 rounded-lg font-semibold transition duration-150">
                    Detayları Gör
                </a>
            </div>
        </div>
    `;
}

export async function addProduct(productData) {
    if (!currentUser || currentUser.email.toLowerCase() !== ADMIN_EMAIL) {
        throw new Error("Yetkisiz İşlem: Ürün eklemek için admin olmalısınız.");
    }
    try {
        await addDoc(productsCollection, productData);
    } catch (error) {
        console.error("Ürün ekleme hatası:", error);
        throw error;
    }
}

export async function deleteProduct(productId) {
    if (!currentUser || currentUser.email.toLowerCase() !== ADMIN_EMAIL) {
        throw new Error("Yetkisiz İşlem: Ürün silmek için admin olmalısınız.");
    }
    try {
        await deleteDoc(doc(productsCollection, productId));
    } catch (error) {
        console.error("Ürün silme hatası:", error);
        throw error;
    }
}

export async function createOrder(cart, totalPrice) {
    if (!currentUser) {
        throw new Error("Sipariş oluşturmak için giriş yapmalısınız.");
    }
    try {
        const orderRef = await addDoc(ordersCollection, {
            userId: currentUser.auth.uid,
            items: cart,
            totalPrice: totalPrice,
            date: Timestamp.now(),
            status: "Beklemede"
        });
        return orderRef.id;
    } catch (error) {
        console.error("Sipariş oluşturma hatası:", error);
        throw error;
    }
}

/**
 * Geri sayım sayacını başlatır (index.html'den taşındı)
 */
export function startCountdown(targetDate, daysEl, hoursEl, minutesEl, secondsEl) {
    if (!targetDate || !daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    // Hedef tarihin Date nesnesi olduğunu varsayalım (targetDate)
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;

        if (distance < 0) {
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            clearInterval(interval);
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
    }, 1000);
}

/**
 * Admin Panelinde sipariş detaylarını göster/gizle
 */
window.toggleOrderDetails = (orderId) => {
    const detailsEl = document.getElementById(`order-details-${orderId}`);
    if (detailsEl) {
        detailsEl.classList.toggle('hidden');
    }
}
