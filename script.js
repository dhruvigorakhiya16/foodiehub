/* ============================================
   RESTAURANT WEBSITE - CUSTOM JAVASCRIPT
   ============================================ */

// Module-scope shared helpers so the reservation modal handler (defined at
// module scope near the bottom) can access them even though they are
// initialized inside the DOMContentLoaded callback.

// Auto-detect the correct API base URL so the menu (and all other features)
// work BOTH locally and when deployed:
//  - Local: file:// or localhost/127.0.0.1 -> http://localhost:5000/api
//  - Vercel / any remote host: frontend and /api share the same origin
function detectApiUrl() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || '';
    const isLocal =
      protocol === 'file:' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1';
    if (isLocal) {
      return 'http://localhost:5000/api';
    }
  }
  return '/api'; // Vercel deployment (same origin)
}
let API_URL = detectApiUrl();
let VALIDATION = null;
let showFloatingToast = null;

// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', function () {

  // ===== 0. INIT AOS (Animate on Scroll) =====
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      offset: 50,
    });
  }

  // Add page-enter class to body for animation
  document.body.classList.add('page-loaded');

  // ===== 1. NAVBAR SCROLL EFFECT =====
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  });

  // ===== 2. ACTIVE NAV LINK HIGHLIGHTING =====
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  navLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // ===== 3. AUTO-CLOSE MOBILE NAV ON CLICK =====
  const navCollapse = document.getElementById('navbarNav');
  const navItems = document.querySelectorAll('.navbar-nav .nav-link');
  navItems.forEach(item => {
    item.addEventListener('click', function () {
      if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navCollapse, { toggle: true });
      }
    });
  });

  // ===== 4. SMOOTH SCROLL FOR ANCHOR LINKS =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ============================================================
  //              VALIDATION UTILITY FUNCTIONS
  // ============================================================
  VALIDATION = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: (v) => /^[\d\+\-\(\)\s]{7,15}$/.test(v.trim()),
    password: (v) => v.length >= 6,
    notEmpty: (v) => v.trim().length > 0,
    match: (a, b) => a === b,
    minLength: (v, min) => v.trim().length >= min,
    futureDate: (v) => {
      if (!v) return false;
      const d = new Date(v);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    }
  };

  function showFieldError(inputEl, message) {
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');
    let feedback = inputEl.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      inputEl.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
  }

  function showFieldSuccess(inputEl) {
    inputEl.classList.remove('is-invalid');
    inputEl.classList.add('is-valid');
    const feedback = inputEl.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = '';
  }

  function validateField(inputEl, validator, errorMsg) {
    if (validator(inputEl.value)) {
      showFieldSuccess(inputEl);
      return true;
    } else {
      showFieldError(inputEl, errorMsg);
      return false;
    }
  }

// ============================================================
  //                     CART SYSTEM
  // ============================================================
  let cart = loadCart();

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem('foodiehub_cart')) || [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem('foodiehub_cart', JSON.stringify(cart));
    updateCartBadge();
  }

  function addToCart(item) {
     const user = localStorage.getItem("foodiehub_user");
    if(!user){
        showFloatingToast(
            "⚠️ You are not logged in. Please login to add items to cart.",
            "error"
        );
        setTimeout(()=>{
            window.location.href = "login.html";
        },1500);
        return;
    }
    
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity || 1,
        image: item.image || ''
      });
    }
    saveCart();

    // Also send to backend API
    let user_id = null;
    try {
      const userData = JSON.parse(localStorage.getItem('foodiehub_user') || '{}');
      if (userData.id) user_id = userData.id;
    } catch (e) {}

    // Show toast immediately for instant feedback
    showFloatingToast(`✨ "${item.name}" added to cart! 🛒`, 'success');

    fetch(API_URL + '/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_id: item.id,
        price: parseFloat(item.price),
        quantity: item.quantity || 1,
        user_id: user_id
      })
    })
    .then(res => res.json())
    .catch(err => {
      console.log('Backend cart sync unavailable:', err);
    });
  }

  showFloatingToast = function (message, type) {
    document.querySelectorAll('.floating-toast').forEach(t => t.remove());

    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      info: '<i class="fas fa-info-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>'
    };
    const icon = icons[type] || icons.info;

    const toast = document.createElement('div');
    toast.className = `floating-toast toast-${type || 'info'}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.closest('.floating-toast').remove()">&times;</button>
      </div>
      <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 450);
    }, 3000);
  };
  window.showFloatingToast = showFloatingToast;

  function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    renderCartModal();
  }

  function updateQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id);
      return;
    }
    saveCart();
    renderCartModal();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCartModal();
  }

  function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  function getCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const deliveryFee = subtotal > 0 ? 40 : 0;
    const total = subtotal + tax + deliveryFee;
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      deliveryFee: deliveryFee,
      total: parseFloat(total.toFixed(2))
    };
  }

  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const badgeNav = document.getElementById('cartBadgeNav');
    const count = getCartCount();
    
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }
    if (badgeNav) {
      if (count > 0) {
        badgeNav.textContent = count;
        badgeNav.classList.remove('d-none');
      } else {
        badgeNav.classList.add('d-none');
      }
    }
  }

  function formatPrice(amount) {
    return '₹' + amount.toFixed(2);
  }

  function showCartAlert(type, message) {
    const alertBox = document.getElementById('cartAlert');
    if (!alertBox) return;
    alertBox.className = 'alert alert-' + type;
    alertBox.innerHTML = message;
    alertBox.classList.remove('d-none');
    setTimeout(() => alertBox.classList.add('d-none'), 2500);
  }

  // ===== RENDER CART MODAL =====
  function renderCartModal() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartSummary = document.getElementById('cartSummary');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const checkoutForm = document.getElementById('checkoutForm');

    if (!cartItems) return;

    if (cart.length === 0) {
      cartItems.classList.add('d-none');
      cartEmpty.classList.remove('d-none');
      if (cartSummary) cartSummary.classList.add('d-none');
      if (checkoutBtn) checkoutBtn.classList.add('d-none');
      if (clearCartBtn) clearCartBtn.classList.add('d-none');
      if (checkoutForm) checkoutForm.classList.add('d-none');
      return;
    }

    cartEmpty.classList.add('d-none');
    cartItems.classList.remove('d-none');
    if (checkoutBtn) checkoutBtn.classList.remove('d-none');
    if (clearCartBtn) clearCartBtn.classList.remove('d-none');

    let html = '';
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      html += `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${formatPrice(item.price)}</div>
          </div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="window.updateQuantity(${item.id}, -1)"><i class="fas fa-minus"></i></button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="window.updateQuantity(${item.id}, 1)"><i class="fas fa-plus"></i></button>
          </div>
          <div class="cart-item-total">${formatPrice(itemTotal)}</div>
          <button class="cart-remove-btn" onclick="window.removeFromCart(${item.id})" title="Remove"><i class="fas fa-times"></i></button>
        </div>
      `;
    });
    cartItems.innerHTML = html;

    if (cartSummary) {
      const totals = getCartTotals();
      document.getElementById('cartSubtotal').textContent = formatPrice(totals.subtotal);
      document.getElementById('cartTax').textContent = formatPrice(totals.tax);
      document.getElementById('cartDeliveryFee').textContent = formatPrice(totals.deliveryFee);
      document.getElementById('cartTotal').textContent = formatPrice(totals.total);
      cartSummary.classList.remove('d-none');
    }

    if (checkoutForm) checkoutForm.classList.add('d-none');
  }

  // Global access for inline onclick handlers
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQuantity = updateQuantity;
  window.clearCart = clearCart;
  window.formatPrice = formatPrice;
  window.updateCartBadge = updateCartBadge;

  // ===== CART BUTTON - OPEN MODAL =====
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function () {
      renderCartModal();
      const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
      cartModal.show();
    });
  }

  // ===== CLEAR CART BUTTON =====
  const clearCartBtn = document.getElementById('clearCartBtn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', function () {
      if (confirm('Clear all items from cart?')) {
        clearCart();
        showCartAlert('success', 'Cart cleared!');
      }
    });
  }

  // ===== CHECKOUT - SHOW DELIVERY FORM =====
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      const checkoutForm = document.getElementById('checkoutForm');
      if (!checkoutForm) return;

      if (checkoutForm.classList.contains('d-none')) {
        try {
          const userData = JSON.parse(localStorage.getItem('foodiehub_user') || '{}');
          if (userData.name) document.getElementById('orderName').value = userData.name;
          if (userData.email) document.getElementById('orderEmail').value = userData.email;
          if (userData.phone_no) document.getElementById('orderPhone').value = userData.phone_no;
        } catch (e) {}
        checkoutForm.classList.remove('d-none');
        checkoutBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i>Confirm & Pay';
      } else {
        submitOrder();
      }
    });
  }

  // ===== SUBMIT ORDER =====
  function submitOrder() {
    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const payment = document.getElementById('orderPayment').value;

    // Validation
    if (!name) {
      showCartAlert('danger', 'Please enter your name.');
      document.getElementById('orderName').focus();
      return;
    }
    if (!VALIDATION.phone(phone)) {
      showCartAlert('danger', 'Please enter a valid phone number.');
      document.getElementById('orderPhone').focus();
      return;
    }
    if (!address || address.length < 5) {
      showCartAlert('danger', 'Please enter a complete delivery address.');
      document.getElementById('orderAddress').focus();
      return;
    }

    const totals = getCartTotals();
    const items = cart.map(item => ({
      food_item_id: typeof item.id === 'number' ? item.id : null,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price
    }));

    const payload = {
      customer_name: name,
      phone: phone,
      email: email || null,
      address: address,
      payment_method: payment,
      items: items
    };

    try {
      const userData = JSON.parse(localStorage.getItem('foodiehub_user') || '{}');
      if (userData.id) payload.user_id = userData.id;
    } catch (e) {}

    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Placing Order...';

    fetch(API_URL + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      btn.disabled = false;
      if (data.order_id) {
        document.getElementById('confirmOrderId').textContent = data.order_id;
        document.getElementById('confirmOrderTotal').textContent = formatPrice(data.total_amount);

        const cartModalEl = document.getElementById('cartModal');
        const cartModal = bootstrap.Modal.getInstance(cartModalEl);
        if (cartModal) cartModal.hide();

        setTimeout(() => {
          const confirmModal = new bootstrap.Modal(document.getElementById('orderConfirmModal'));
          confirmModal.show();
        }, 300);

        cart = [];
        saveCart();
        renderCartModal();
      } else {
        showCartAlert('danger', data.message || 'Order failed. Please try again.');
        btn.innerHTML = '<i class="fas fa-check-circle me-1"></i>Confirm & Pay';
      }
    })
    .catch(err => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle me-1"></i>Confirm & Pay';
      showCartAlert('danger', 'Cannot connect to server. Make sure the backend is running.');
    });
  }

  // ===== RESET CART MODAL ON CLOSE =====
  const cartModalEl = document.getElementById('cartModal');
  if (cartModalEl) {
    cartModalEl.addEventListener('hidden.bs.modal', function () {
      const checkoutForm = document.getElementById('checkoutForm');
      if (checkoutForm) checkoutForm.classList.add('d-none');
      const checkoutBtn = document.getElementById('checkoutBtn');
      if (checkoutBtn) checkoutBtn.innerHTML = '<i class="fas fa-credit-card me-1"></i>Place Order';
      const alertBox = document.getElementById('cartAlert');
      if (alertBox) alertBox.classList.add('d-none');
    });
  }

  // ===== CONTINUE SHOPPING (cart modal + after order) -> redirect to menu page =====
  // Cart modal footer "Continue Shopping" button (all pages with cart modal)
  document.querySelectorAll('#cartModal .modal-footer .btn-secondary').forEach(btn => {
    btn.addEventListener('click', function () {
      window.location.href = 'menu.html';
    });
  });

  // Order confirmation modal "Continue Shopping" button (all pages)
  document.querySelectorAll('#continueShoppingBtn').forEach(btn => {
    btn.addEventListener('click', function () {
      window.location.href = 'menu.html';
    });
  });

  // ============================================================
  //          5. FETCH & DISPLAY FOOD ITEMS (menu.html)
  // ============================================================
  const foodContainer = document.getElementById('foodCardsContainer');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorMessage = document.getElementById('errorMessage');

  if (foodContainer) {
    fetchFoodItems();
  }

// Static fallback menu used when the backend API is unreachable (e.g. the
  // deployed site on Vercel has no remote MySQL database). This guarantees the
  // menu always displays instead of showing an error toast.
  const FALLBACK_MENU = [
    { food_id: 1, food_name: 'Margherita Pizza', description: 'Classic hand-tossed pizza with fresh mozzarella, basil, and tomato sauce', price: 299.00, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Pizza', rating: 4.7, food_type: 'Veg', is_best_seller: 1 },
    { food_id: 2, food_name: 'Pepperoni Pizza', description: 'Loaded with pepperoni and melted cheese on a crispy crust', price: 349.00, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Pizza', rating: 4.5, food_type: 'Non-Veg', is_best_seller: 1 },
    { food_id: 3, food_name: 'Classic Burger', description: 'Juicy beef patty with lettuce, tomato, cheese, and special sauce', price: 249.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Burger', rating: 4.6, food_type: 'Non-Veg', is_best_seller: 0 },
    { food_id: 4, food_name: 'Bacon Cheeseburger', description: 'Premium beef with crispy bacon, cheddar, and caramelized onions', price: 299.00, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Burger', rating: 4.8, food_type: 'Non-Veg', is_best_seller: 1 },
    { food_id: 5, food_name: 'Spaghetti Carbonara', description: 'Creamy egg-based sauce with pancetta and parmesan cheese', price: 279.00, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Pasta', rating: 4.4, food_type: 'Non-Veg', is_best_seller: 0 },
    { food_id: 6, food_name: 'Penne Arrabbiata', description: 'Spicy tomato sauce with garlic, chili flakes, and fresh parsley', price: 229.00, image: 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Pasta', rating: 4.3, food_type: 'Veg', is_best_seller: 0 },
    { food_id: 7, food_name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a molten center, served with ice cream', price: 179.00, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Dessert', rating: 4.9, food_type: 'Veg', is_best_seller: 1 },
    { food_id: 8, food_name: 'Fresh Lemonade', description: 'House-made lemonade with fresh mint and a splash of soda', price: 99.00, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Drinks', rating: 4.6, food_type: 'Veg', is_best_seller: 0 },
    { food_id: 9, food_name: 'Grilled Salmon', description: 'Atlantic salmon fillet with lemon butter sauce and seasonal vegetables', price: 399.00, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Seafood', rating: 4.7, food_type: 'Non-Veg', is_best_seller: 1 },
    { food_id: 10, food_name: 'Butter Chicken', description: 'Tender chicken in rich creamy tomato gravy with butter naan', price: 329.00, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Indian', rating: 4.8, food_type: 'Non-Veg', is_best_seller: 1 },
    { food_id: 11, food_name: 'Paneer Tikka Masala', description: 'Grilled cottage cheese in spiced onion-tomato gravy', price: 279.00, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Indian', rating: 4.6, food_type: 'Veg', is_best_seller: 0 },
    { food_id: 12, food_name: 'New York Cheesecake', description: 'Creamy classic cheesecake with berry compote', price: 199.00, image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', category_name: 'Dessert', rating: 4.8, food_type: 'Veg', is_best_seller: 1 }
  ];

  function renderFallbackMenu() {
    if (loadingSpinner) loadingSpinner.classList.add('d-none');
    foodContainer.innerHTML = '';
    FALLBACK_MENU.forEach(food => {
      const card = createFoodCard(food);
      foodContainer.appendChild(card);
    });
    if (typeof AOS !== 'undefined') AOS.refresh();
  }

  function fetchFoodItems() {
    fetch(API_URL + '/foods')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(foods => {
        if (loadingSpinner) loadingSpinner.classList.add('d-none');

        if (!foods || foods.length === 0) {
          renderFallbackMenu();
          return;
        }

        foods.forEach(food => {
          const card = createFoodCard(food);
          foodContainer.appendChild(card);
        });

        if (typeof AOS !== 'undefined') {
          AOS.refresh();
        }
      })
      .catch(error => {
        console.warn('Backend unavailable, showing fallback menu:', error);
        if (errorMessage) errorMessage.classList.add('d-none');
        renderFallbackMenu();
      });
  }

  function createFoodCard(food) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    col.setAttribute('data-aos', 'slide-blur-pop-up');
    col.setAttribute('data-aos-delay', '100');

    // Normalize field names
    const foodId = food.food_id || food.id;
    const foodName = food.food_name || food.name;
    const foodImage = food.image || food.image_url || '';
    const foodCategory = food.category_name || food.category || 'General';
    const foodRating = food.rating ? parseFloat(food.rating).toFixed(1) : '4.5';
    const foodType = (food.food_type || 'Veg').toLowerCase();
    const isBestSeller = food.is_best_seller == 1 || food.is_best_seller === true;
    const price = parseFloat(food.price);

    let imgUrl = foodImage;
    if (!imgUrl || (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:'))) {
      const categoryImages = {
        'Pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        'Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        'Pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        'Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        'Drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        'Dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      };
      imgUrl = categoryImages[foodCategory] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
    }

    let badgesHtml = `
      <span class="food-type-badge ${foodType === 'non-veg' ? 'non-veg' : 'veg'}">
        <span class="dot"></span>
      </span>
    `;
    if (isBestSeller) {
      badgesHtml += `<span class="best-seller-badge"><i class="fas fa-crown me-1"></i>Best Seller</span>`;
    }

    col.innerHTML = `
      <div class="food-card">
        <div class="food-card-img-wrapper">
          <img src="${imgUrl}" alt="${foodName}" class="food-card-img" loading="lazy">
          <span class="food-card-badge">${foodCategory}</span>
          ${badgesHtml}
          <span class="food-card-rating">
            <i class="fas fa-star"></i> ${foodRating}
          </span>
        </div>
        <div class="food-card-body">
          <h3 class="food-card-name">${foodName}</h3>
          <p class="food-card-desc">${food.description || 'Delicious dish made with fresh ingredients.'}</p>
          <div class="food-card-price">
            <span class="currency">₹</span>${price.toFixed(2)}
          </div>
          <button class="btn-add-cart" data-id="${foodId}" data-name="${foodName}" data-price="${price}" data-image="${imgUrl}">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
        </div>
      </div>
    `;

    const addToCartBtn = col.querySelector('.btn-add-cart');
    addToCartBtn.addEventListener('click', function () {
      const btn = this;
      const id = parseInt(btn.dataset.id);
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image;

      addToCart({ id, name, price, image });

      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Added!';
      btn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    });

    return col;
  }

  // ===== SEARCH & FILTER for MENU PAGE =====
  const menuSearch = document.getElementById('menuSearch');
  const menuCategoryFilter = document.getElementById('menuCategoryFilter');
  const menuTypeFilter = document.getElementById('menuTypeFilter');
  const noResultsMessage = document.getElementById('noResultsMessage');

  if (menuSearch && menuCategoryFilter && menuTypeFilter) {
    fetch(API_URL + '/categories')
      .then(r => r.json())
      .then(cats => {
        cats.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.category_name;
          opt.textContent = c.category_name;
          menuCategoryFilter.appendChild(opt);
        });
      })
      .catch(() => {});

    function filterFoodItems() {
      const searchTerm = menuSearch.value.toLowerCase().trim();
      const category = menuCategoryFilter.value;
      const type = menuTypeFilter.value;
      const cards = document.querySelectorAll('#foodCardsContainer .col-12');

      let visibleCount = 0;
      cards.forEach(card => {
        const name = (card.querySelector('.food-card-name')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('.food-card-desc')?.textContent || '').toLowerCase();
        const cardCategory = (card.querySelector('.food-card-badge')?.textContent || '');
        const cardTypeEl = card.querySelector('.food-type-badge');
        const cardType = cardTypeEl?.classList.contains('non-veg') ? 'Non-Veg' : 'Veg';

        const matchesSearch = !searchTerm || name.includes(searchTerm) || desc.includes(searchTerm);
        const matchesCategory = !category || cardCategory === category;
        const matchesType = !type || cardType === type;

        if (matchesSearch && matchesCategory && matchesType) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (noResultsMessage) {
        if (visibleCount === 0) {
          noResultsMessage.classList.remove('d-none');
        } else {
          noResultsMessage.classList.add('d-none');
        }
      }
    }

    menuSearch.addEventListener('input', filterFoodItems);
    menuCategoryFilter.addEventListener('change', filterFoodItems);
    menuTypeFilter.addEventListener('change', filterFoodItems);
  }

  // Initialize badge on page load
  updateCartBadge();

  // ============================================================
  //          6. LOGIN FORM HANDLER
  // ============================================================
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const rememberMe = document.getElementById('rememberMe');

    // Pre-fill email if "Remember me" was previously checked
    try {
      const rememberedEmail = localStorage.getItem('foodiehub_remembered_email');
      if (rememberedEmail && loginEmail) {
        loginEmail.value = rememberedEmail;
        if (rememberMe) rememberMe.checked = true;
      }
    } catch (e) {}

    // Real-time validation
    loginEmail.addEventListener('blur', function () {
      validateField(this, VALIDATION.email, 'Please enter a valid email address');
    });
    loginPassword.addEventListener('blur', function () {
      validateField(this, VALIDATION.password, 'Password must be at least 6 characters');
    });

    // Toggle password visibility (show/hide typed text)
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    if (toggleLoginPassword && loginPassword) {
      toggleLoginPassword.addEventListener('click', function () {
        const isPassword = loginPassword.getAttribute('type') === 'password';
        loginPassword.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        }
        this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        loginPassword.focus();
      });
    }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      const alertBox = document.getElementById('loginAlert');
      const btn = document.getElementById('loginBtn');
      const btnText = document.getElementById('loginBtnText');
      const spinner = document.getElementById('loginBtnSpinner');

      // Validate
      const isEmailValid = validateField(loginEmail, VALIDATION.email, 'Please enter a valid email address');
      const isPassValid = validateField(loginPassword, VALIDATION.password, 'Password must be at least 6 characters');
      if (!isEmailValid || !isPassValid) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Please fix the errors above.';
        alertBox.classList.remove('d-none');
        return;
      }

      btn.disabled = true;
      btnText.textContent = 'Signing in...';
      spinner.classList.remove('d-none');
      alertBox.classList.add('d-none');

      fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json())
      .then(data => {
        btn.disabled = false;
        btnText.textContent = 'Sign In';
        spinner.classList.add('d-none');

        if (data.role === 'admin' && data.admin) {
          localStorage.setItem('foodiehub_admin', JSON.stringify(data.admin));
          localStorage.removeItem('foodiehub_user');

          showFloatingToast('👑 Welcome back, ' + data.admin.name + '! Redirecting to admin panel...', 'success');
          alertBox.className = 'alert alert-success';
          alertBox.textContent = 'Welcome back, ' + data.admin.name + '! Redirecting to admin panel...';
          alertBox.classList.remove('d-none');
          setTimeout(() => { window.location.href = 'admin.html'; }, 1500);
        } else if (data.role === 'user' && data.user) {
          localStorage.setItem('foodiehub_user', JSON.stringify(data.user));
          localStorage.removeItem('foodiehub_admin');

          // Handle "Remember me" — save/clear the remembered email
          if (rememberMe && rememberMe.checked) {
            localStorage.setItem('foodiehub_remembered_email', email);
          } else {
            localStorage.removeItem('foodiehub_remembered_email');
          }

          showFloatingToast('👋 Welcome back, ' + data.user.name + '! Redirecting...', 'success');
          alertBox.className = 'alert alert-success';
          alertBox.textContent = 'Welcome back, ' + data.user.name + '! Redirecting...';
          alertBox.classList.remove('d-none');
          setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } else {
          showFloatingToast('❌ ' + (data.message || 'Login failed'), 'error');
          alertBox.className = 'alert alert-danger';
          alertBox.textContent = data.message || 'Login failed';
          alertBox.classList.remove('d-none');
        }
      })
      .catch(err => {
        btn.disabled = false;
        btnText.textContent = 'Sign In';
        spinner.classList.add('d-none');
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Cannot connect to server. Make sure the backend is running.';
        alertBox.classList.remove('d-none');
      });
    });
  }

  // ============================================================
  //          7. REGISTER FORM HANDLER
  // ============================================================
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const regName = document.getElementById('regName');
    const regEmail = document.getElementById('regEmail');
    const regPhone = document.getElementById('regPhone');
    const regPassword = document.getElementById('regPassword');
    const regConfirmPassword = document.getElementById('regConfirmPassword');

    // Real-time validation
    regName.addEventListener('blur', function () {
      validateField(this, v => v.trim().length >= 2, 'Name must be at least 2 characters');
    });
    regEmail.addEventListener('blur', function () {
      validateField(this, VALIDATION.email, 'Please enter a valid email address');
    });
    regPhone.addEventListener('blur', function () {
      validateField(this, VALIDATION.phone, 'Please enter a valid phone number');
    });
    regPassword.addEventListener('blur', function () {
      validateField(this, VALIDATION.password, 'Password must be at least 6 characters');
    });
    regConfirmPassword.addEventListener('blur', function () {
      validateField(this, v => VALIDATION.match(v, regPassword.value), 'Passwords do not match');
    });

    // Toggle password visibility for Register form
    function setupPasswordToggle(toggleBtn, passwordInput) {
      if (!toggleBtn || !passwordInput) return;
      toggleBtn.addEventListener('click', function () {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        }
        this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        passwordInput.focus();
      });
    }
    setupPasswordToggle(document.getElementById('toggleRegPassword'), regPassword);
    setupPasswordToggle(document.getElementById('toggleRegConfirmPassword'), regConfirmPassword);

    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = regName.value.trim();
      const email = regEmail.value.trim();
      const phone = regPhone.value.trim();
      const password = regPassword.value;
      const confirmPassword = regConfirmPassword.value;
      const address = document.getElementById('regAddress').value.trim();
      const alertBox = document.getElementById('registerAlert');
      const btn = document.getElementById('registerBtn');
      const btnText = document.getElementById('registerBtnText');
      const spinner = document.getElementById('registerBtnSpinner');

      // Validate all fields
      const isNameValid = validateField(regName, v => v.trim().length >= 2, 'Name must be at least 2 characters');
      const isEmailValid = validateField(regEmail, VALIDATION.email, 'Please enter a valid email address');
      const isPhoneValid = validateField(regPhone, VALIDATION.phone, 'Please enter a valid phone number');
      const isPassValid = validateField(regPassword, VALIDATION.password, 'Password must be at least 6 characters');
      const isConfirmValid = validateField(regConfirmPassword, v => VALIDATION.match(v, password), 'Passwords do not match');

      if (!isNameValid || !isEmailValid || !isPhoneValid || !isPassValid || !isConfirmValid) {
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Please fix the errors above.';
        alertBox.classList.remove('d-none');
        return;
      }

      btn.disabled = true;
      btnText.textContent = 'Creating account...';
      spinner.classList.remove('d-none');
      alertBox.classList.add('d-none');

      fetch(API_URL + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone_no: phone, address })
      })
      .then(res => res.json())
      .then(data => {
        btn.disabled = false;
        btnText.textContent = 'Create Account';
        spinner.classList.add('d-none');

        if (data.message === 'Registration successful') {
          showFloatingToast('🎉 Account created successfully! Please sign in.', 'success');
          alertBox.className = 'alert alert-success';
          alertBox.innerHTML = 'Account created! <a href="login.html" class="alert-link">Sign in now</a>';
          alertBox.classList.remove('d-none');
          registerForm.reset();
          // Reset validation states
          document.querySelectorAll('#registerForm .form-control').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
          });
        } else {
          showFloatingToast('❌ ' + (data.message || 'Registration failed'), 'error');
          alertBox.className = 'alert alert-danger';
          alertBox.textContent = data.message || 'Registration failed';
          alertBox.classList.remove('d-none');
        }
      })
      .catch(err => {
        btn.disabled = false;
        btnText.textContent = 'Create Account';
        spinner.classList.add('d-none');
        alertBox.className = 'alert alert-danger';
        alertBox.textContent = 'Cannot connect to server. Make sure the backend is running.';
        alertBox.classList.remove('d-none');
      });
    });
  }

  // ============================================================
  //          9. CONTACT FORM HANDLER
  // ============================================================
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const contactName = document.getElementById('contactName');
    const contactEmail = document.getElementById('contactEmail');
    const contactSubject = document.getElementById('contactSubject');
    const contactMessage = document.getElementById('contactMessage');

    // Real-time validation
    contactName.addEventListener('blur', function () {
      validateField(this, v => v.trim().length >= 2, 'Name must be at least 2 characters');
    });
    contactEmail.addEventListener('blur', function () {
      validateField(this, VALIDATION.email, 'Please enter a valid email address');
    });
    contactSubject.addEventListener('blur', function () {
      validateField(this, v => v.trim().length >= 3, 'Subject must be at least 3 characters');
    });
    contactMessage.addEventListener('blur', function () {
      validateField(this, v => v.trim().length >= 10, 'Message must be at least 10 characters');
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = contactName.value.trim();
      const email = contactEmail.value.trim();
      const subject = contactSubject.value.trim();
      const message = contactMessage.value.trim();
      const alertBox = document.getElementById('contactAlert');
      const btn = document.getElementById('contactSubmitBtn');
      const btnText = document.getElementById('contactBtnText');
      const spinner = document.getElementById('contactBtnSpinner');

      // Validate
      const isNameValid = validateField(contactName, v => v.trim().length >= 2, 'Name must be at least 2 characters');
      const isEmailValid = validateField(contactEmail, VALIDATION.email, 'Please enter a valid email address');
      const isSubjectValid = validateField(contactSubject, v => v.trim().length >= 3, 'Subject must be at least 3 characters');
      const isMessageValid = validateField(contactMessage, v => v.trim().length >= 10, 'Message must be at least 10 characters');

      if (!isNameValid || !isEmailValid || !isSubjectValid || !isMessageValid) {
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>Please fix the errors above.';
        alertBox.classList.remove('d-none');
        return;
      }

      btn.disabled = true;
      btnText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
      spinner.classList.remove('d-none');
      alertBox.classList.add('d-none');

      fetch(API_URL + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      })
      .then(res => res.json())
      .then(data => {
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Message';
        spinner.classList.add('d-none');

        if (data.contact_id) {
          showFloatingToast('📬 Message sent! We\'ll get back to you soon.', 'success');
          alertBox.className = 'alert alert-success';
          alertBox.innerHTML = '<i class="fas fa-check-circle me-2"></i>Thank you, ' + name + '! Your message has been received. We will get back to you soon.';
          alertBox.classList.remove('d-none');
          contactForm.reset();
          document.querySelectorAll('#contactForm .form-control').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
          });
        } else {
          alertBox.className = 'alert alert-danger';
          alertBox.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>' + (data.message || 'Failed to send message.');
          alertBox.classList.remove('d-none');
        }
      })
      .catch(err => {
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Message';
        spinner.classList.add('d-none');
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i>Cannot connect to server. Make sure the backend is running.';
        alertBox.classList.remove('d-none');
      });
    });
  }

  // ============================================================
  //          10. UNIFIED LOGIN MODAL (handles user + admin)
  // ============================================================
  const modalLoginForm = document.getElementById('modalLoginForm');
  if (modalLoginForm) {
    const modalLoginEmail = document.getElementById('modalLoginEmail');
    const modalLoginPassword = document.getElementById('modalLoginPassword');
    const modalAlert = document.getElementById('modalLoginAlert');
    const modalBtn = document.getElementById('modalLoginBtn');
    const modalBtnText = document.getElementById('modalLoginBtnText');
    const modalSpinner = document.getElementById('modalLoginBtnSpinner');

    // Real-time validation
    modalLoginEmail.addEventListener('blur', function () {
      validateField(this, VALIDATION.email, 'Please enter a valid email address');
    });
    modalLoginPassword.addEventListener('blur', function () {
      validateField(this, VALIDATION.password, 'Password must be at least 6 characters');
    });

    // Toggle password visibility (show/hide typed text)
    const toggleModalPassword = document.getElementById('toggleModalLoginPassword');
    if (toggleModalPassword && modalLoginPassword) {
      toggleModalPassword.addEventListener('click', function () {
        const isPassword = modalLoginPassword.getAttribute('type') === 'password';
        modalLoginPassword.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        }
        this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        modalLoginPassword.focus();
      });
    }

    // Reset modal state each time it opens
    const loginModalEl = document.getElementById('loginModal');
    if (loginModalEl) {
      loginModalEl.addEventListener('show.bs.modal', function () {
        if (modalAlert) modalAlert.classList.add('d-none');
        modalLoginEmail.classList.remove('is-invalid', 'is-valid');
        modalLoginPassword.classList.remove('is-invalid', 'is-valid');
        modalLoginForm.reset();
      });
    }

    modalLoginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = modalLoginEmail.value.trim();
      const password = modalLoginPassword.value;

      // Validate
      const isEmailValid = validateField(modalLoginEmail, VALIDATION.email, 'Please enter a valid email address');
      const isPassValid = validateField(modalLoginPassword, VALIDATION.password, 'Password must be at least 6 characters');
      if (!isEmailValid || !isPassValid) {
        if (modalAlert) {
          modalAlert.className = 'alert alert-danger';
          modalAlert.textContent = 'Please fix the errors above.';
          modalAlert.classList.remove('d-none');
        }
        return;
      }

      modalBtn.disabled = true;
      if (modalBtnText) modalBtnText.textContent = 'Signing in...';
      if (modalSpinner) modalSpinner.classList.remove('d-none');
      if (modalAlert) modalAlert.classList.add('d-none');

      fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json())
      .then(data => {
        modalBtn.disabled = false;
        if (modalBtnText) modalBtnText.textContent = 'Sign In';
        if (modalSpinner) modalSpinner.classList.add('d-none');

        if (data.role === 'admin' && data.admin) {
          localStorage.setItem('foodiehub_admin', JSON.stringify(data.admin));
          showFloatingToast('👑 Welcome back, ' + data.admin.name + '! Redirecting to admin panel...', 'success');
          const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
          if (modal) modal.hide();
          setTimeout(() => { window.location.href = 'admin.html'; }, 1200);
        } else if (data.role === 'user' && data.user) {
          localStorage.setItem('foodiehub_user', JSON.stringify(data.user));
          showFloatingToast('👋 Welcome back, ' + data.user.name + '!', 'success');
          const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
          if (modal) modal.hide();
          updateAuthNavbar();
          setTimeout(() => { window.location.href = 'index.html'; }, 1200);
        } else {
          if (modalAlert) {
            modalAlert.className = 'alert alert-danger';
            modalAlert.textContent = data.message || 'Login failed';
            modalAlert.classList.remove('d-none');
          }
        }
      })
      .catch(err => {
        modalBtn.disabled = false;
        if (modalBtnText) modalBtnText.textContent = 'Sign In';
        if (modalSpinner) modalSpinner.classList.add('d-none');
        if (modalAlert) {
          modalAlert.className = 'alert alert-danger';
          modalAlert.textContent = 'Cannot connect to server. Make sure the backend is running.';
          modalAlert.classList.remove('d-none');
        }
      });
    });
  }

  // ============================================================
  //          11. DYNAMIC AUTH NAVBAR (stateful per role)
  // ============================================================
  function updateAuthNavbar() {
    const navAuth = document.getElementById('navAuthBtns');
    if (!navAuth) return;

    let user = null, admin = null;
    try { user = JSON.parse(localStorage.getItem('foodiehub_user') || 'null'); } catch (e) { user = null; }
    try { admin = JSON.parse(localStorage.getItem('foodiehub_admin') || 'null'); } catch (e) { admin = null; }

    const cartBtnHtml = '<button class="btn btn-info btn-sm rounded-pill px-3 position-relative" id="cartBtn" type="button"><i class="fas fa-shopping-cart me-1"></i>Cart<span id="cartBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none">0</span></button>';
    const reserveBtnHtml = '<button class="btn btn-danger btn-sm rounded-pill px-3 ms-1" data-bs-toggle="modal" data-bs-target="#reserveModal"><i class="fas fa-calendar-check me-1"></i>Reserve</button>';

    let authHtml = '';
    if (admin) {
      authHtml = '<a href="admin.html" class="btn btn-outline-warning btn-sm rounded-pill px-3"><i class="fas fa-shield-alt me-1"></i>Admin</a>'
        + '<button class="btn btn-outline-light btn-sm rounded-pill px-3" id="navLogoutBtn" type="button"><i class="fas fa-sign-out-alt me-1"></i>Logout</button>';
    } else if (user) {
      authHtml = '<a href="profile.html" class="btn btn-info btn-sm rounded-pill px-3"><i class="fas fa-user me-1"></i>Profile</a>'
        + '<button class="btn btn-outline-light btn-sm rounded-pill px-3" id="navLogoutBtn" type="button"><i class="fas fa-sign-out-alt me-1"></i>Logout</button>';
    } else {
      authHtml = '<a href="login.html" class="btn btn-outline-light btn-sm rounded-pill px-3"><i class="fas fa-sign-in-alt me-1"></i>Login</a>'
        + '<a href="Register.html" class="btn btn-warning btn-sm rounded-pill px-3 text-dark fw-semibold"><i class="fas fa-user-plus me-1"></i>Register</a>';
    }

    navAuth.innerHTML = authHtml + cartBtnHtml + reserveBtnHtml;

    // Re-bind cart open handler (the innerHTML replacement creates a fresh button)
    const navCartBtn = document.getElementById('cartBtn');
    if (navCartBtn) {
      navCartBtn.addEventListener('click', function () {
        renderCartModal();
        const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
        cartModal.show();
      });
    }

    // Logout handler
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    if (navLogoutBtn) {
      navLogoutBtn.addEventListener('click', function () {
        localStorage.removeItem('foodiehub_user');
        localStorage.removeItem('foodiehub_admin');
        showFloatingToast('👋 You have been logged out.', 'info');
        updateAuthNavbar();
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      });
    }

    updateCartBadge();
  }

  // Initialize the auth-aware navbar + badge on every page
updateAuthNavbar();
  updateCartBadge();

  // ============================================================
  //          8. RESERVATION FORM HANDLER
  // ============================================================

  const reserveForm = document.getElementById("reserveForm");
  const reserveSubmitBtn = document.getElementById("reserveSubmitBtn");

  if (reserveForm && reserveSubmitBtn) {

    // Autofill user details if logged in
    try {
      const user = JSON.parse(localStorage.getItem("foodiehub_user") || "{}");
      if (user.name) document.getElementById("resName").value = user.name;
      if (user.email) document.getElementById("resEmail").value = user.email;
      if (user.phone_no) document.getElementById("resPhone").value = user.phone_no;
    } catch (e) { }

    reserveSubmitBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const name = document.getElementById("resName").value.trim();
      const email = document.getElementById("resEmail").value.trim();
      const phone = document.getElementById("resPhone").value.trim();
      const res_date = document.getElementById("resDate").value;
      const res_time = document.getElementById("resTime").value;
      const guests = document.getElementById("resGuests").value;
      const message = document.getElementById("resMessage").value.trim();
      const alertBox = document.getElementById("reserveAlert");
      const btnText = document.getElementById("reserveBtnText");
      const spinner = document.getElementById("reserveBtnSpinner");
      alertBox.classList.add("d-none");
      // Validation
      if (!name || name.length < 2) {
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Please enter your full name.";
        alertBox.classList.remove("d-none");
        return;
      }
      if (email && !VALIDATION.email(email)) {
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Please enter a valid email.";
        alertBox.classList.remove("d-none");
        return;
      }
      if (!VALIDATION.phone(phone)) {
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Please enter a valid phone number.";
        alertBox.classList.remove("d-none");
        return;
      }
      if (!VALIDATION.futureDate(res_date)) {
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Please select a valid reservation date.";
        alertBox.classList.remove("d-none");
        return;
      }
      if (!res_time) {
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Please select reservation time.";
        alertBox.classList.remove("d-none");
        return;
      }
      if (!guests || parseInt(guests) < 1) {
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Please select number of guests.";
        alertBox.classList.remove("d-none");
        return;
      }
      // Loading
      reserveSubmitBtn.disabled = true;
      btnText.textContent = "Booking...";
      spinner.classList.remove("d-none");
      // Send to Backend
      fetch(API_URL + "/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone,
          res_date: res_date,
          res_time: res_time,
          guests: parseInt(guests),
          message: message
        })
      })
      .then(res => res.json())
      .then(data => {
        reserveSubmitBtn.disabled = false;
        btnText.textContent = "Confirm Reservation";
        spinner.classList.add("d-none");
        if (data.reservation_id) {
          showFloatingToast("🍽️ Reservation booked successfully!", "success");
          alertBox.className = "alert alert-success";
          alertBox.innerHTML = "<strong>Reservation Confirmed!</strong><br>Reservation ID : <b>" + data.reservation_id + "</b>";
          alertBox.classList.remove("d-none");
          reserveForm.reset();
          try {
            const user = JSON.parse(localStorage.getItem("foodiehub_user") || "{}");
            if (user.name) document.getElementById("resName").value = user.name;
            if (user.email) document.getElementById("resEmail").value = user.email;
            if (user.phone_no) document.getElementById("resPhone").value = user.phone_no;
          } catch (e) { }
          setTimeout(function () {
            const modal = bootstrap.Modal.getInstance(document.getElementById("reserveModal"));
            if (modal) modal.hide();
          }, 2500);
        } else {
          alertBox.className = "alert alert-danger";
          alertBox.textContent = data.message || "Reservation failed.";
          alertBox.classList.remove("d-none");
        }
      })
      .catch(function () {
        reserveSubmitBtn.disabled = false;
        btnText.textContent = "Confirm Reservation";
        spinner.classList.add("d-none");
        alertBox.className = "alert alert-danger";
        alertBox.textContent = "Cannot connect to server. Please try again.";
        alertBox.classList.remove("d-none");
      });
    });
  }

  // ============================================================
  // RESET RESERVATION MODAL
  // ============================================================

  const reserveModal = document.getElementById("reserveModal");

  if (reserveModal) {
    reserveModal.addEventListener("hidden.bs.modal", function () {
      reserveForm.reset();
      try {
        const user = JSON.parse(localStorage.getItem("foodiehub_user") || "{}");
        if (user.name) document.getElementById("resName").value = user.name;
        if (user.email) document.getElementById("resEmail").value = user.email;
        if (user.phone_no) document.getElementById("resPhone").value = user.phone_no;
      } catch (e) { }
      const alertBox = document.getElementById("reserveAlert");
      if (alertBox) alertBox.classList.add("d-none");
      reserveSubmitBtn.disabled = false;
      document.getElementById("reserveBtnText").textContent = "Confirm Reservation";
      document.getElementById("reserveBtnSpinner").classList.add("d-none");
    });
  }

});
