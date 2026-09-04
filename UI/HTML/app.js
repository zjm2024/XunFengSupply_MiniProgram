(() => {
  const PRICE = 168;
  const MAX_CART = 100000;
  const colors = [
    { id: 'red', name: '赤焰红', image: 'assets/jersey-red.png' },
    { id: 'black', name: '曜石黑', image: 'assets/jersey-black.png' },
    { id: 'white', name: '冰川白', image: 'assets/jersey-white.png' }
  ];
  const sizes = ['S', 'M', 'L', 'XL', '2XL'];
  const inventory = {
    red:   { S: 200, M: 180, L: 36, XL: 80, '2XL': 0 },
    black: { S: 160, M: 142, L: 96, XL: 28, '2XL': 40 },
    white: { S: 120, M: 118, L: 88, XL: 56, '2XL': 20 }
  };
  const quantities = {
    red:   { S: 10, M: 10, L: 10, XL: 10, '2XL': 0 },
    black: { S: 6, M: 6, L: 6, XL: 6, '2XL': 0 },
    white: { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 }
  };

  let currentView = 'home';
  let activeColor = 'red';
  const historyStack = [];
  const expandedCartColors = new Set();
  const app = document.querySelector('#app');
  const modal = document.querySelector('#modal');
  const modalContent = document.querySelector('#modal-content');
  const toast = document.querySelector('#toast');

  function navigate(view, push = true) {
    const target = document.querySelector(`[data-view="${view}"]`);
    if (!target) return;
    if (push && view !== currentView) historyStack.push(currentView);
    document.querySelectorAll('.view').forEach(section => section.classList.remove('is-active'));
    target.classList.add('is-active');
    currentView = view;
    target.querySelector('.page-scroll')?.scrollTo(0, 0);
    if (view === 'variants') renderVariants();
    if (view === 'cart') renderCart();
    document.title = `${target.querySelector('h1')?.textContent || '首页'} · 薰风经销商下单系统`;
  }

  function goBack() {
    navigate(historyStack.pop() || 'home', false);
  }

  function colorTotal(colorId) {
    return sizes.reduce((sum, size) => sum + quantities[colorId][size], 0);
  }

  function selectedTotals() {
    let colorCount = 0;
    let skuCount = 0;
    let count = 0;
    colors.forEach(color => {
      let hasColor = false;
      sizes.forEach(size => {
        const qty = quantities[color.id][size];
        if (qty > 0) {
          hasColor = true;
          skuCount += 1;
          count += qty;
        }
      });
      if (hasColor) colorCount += 1;
    });
    return { colorCount, skuCount, count, amount: count * PRICE };
  }

  function money(value) {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function stockLabel(value) {
    if (value <= 0) return ['缺货', 'out'];
    if (value <= 100) return [`仅剩 ${value} 件`, 'low'];
    return ['有货', ''];
  }

  function renderVariants() {
    const colorOptions = document.querySelector('#color-options');
    colorOptions.innerHTML = colors.map(color => {
      const count = colorTotal(color.id);
      return `<button class="color-option ${color.id === activeColor ? 'is-active' : ''}" data-color="${color.id}" aria-pressed="${color.id === activeColor}">
        <img src="${color.image}" alt="${color.name}">
        <strong>${color.name}</strong><small>${count ? `已选 ${count} 件` : '未选择'}</small>
      </button>`;
    }).join('');
    document.querySelector('#size-title').textContent = `尺码（${colors.find(c => c.id === activeColor).name}）`;
    const sizeRows = document.querySelector('#size-rows');
    sizeRows.innerHTML = sizes.map(size => {
      const stock = inventory[activeColor][size];
      const [label, className] = stockLabel(stock);
      const qty = quantities[activeColor][size];
      return `<div class="size-row">
        <strong>${size}</strong><span class="stock ${className}">${label}</span>
        <div class="stepper" data-color="${activeColor}" data-size="${size}">
          <button data-step="-1" ${qty === 0 || stock === 0 ? 'disabled' : ''} aria-label="减少 ${size} 数量">−</button>
          <output>${qty}</output>
          <button data-step="1" ${stock === 0 || qty >= stock ? 'disabled' : ''} aria-label="增加 ${size} 数量">＋</button>
        </div>
      </div>`;
    }).join('');
    updateVariantSummary();
  }

  function updateVariantSummary() {
    const totals = selectedTotals();
    document.querySelector('#variant-summary').textContent = `已选 ${totals.colorCount} 个颜色 · ${totals.skuCount} 个 SKU · ${totals.count} 件`;
    document.querySelector('#variant-amount').textContent = money(totals.amount);
    document.querySelector('#batch-add').disabled = totals.count === 0;
  }

  function renderCart() {
    const groups = document.querySelector('#cart-variant-groups');
    groups.innerHTML = colors.map(color => {
      const count = colorTotal(color.id);
      const sku = sizes.filter(size => quantities[color.id][size] > 0).length;
      const expanded = expandedCartColors.has(color.id);
      const sizeRows = sizes.filter(size => quantities[color.id][size] > 0 || (expanded && inventory[color.id][size] === 0)).map(size => {
        const qty = quantities[color.id][size];
        const stock = inventory[color.id][size];
        return `<div class="cart-size-row"><strong>${size}</strong><span class="stock ${stock === 0 ? 'out' : ''}">${stock === 0 ? '缺货' : `库存 ${stock}`}</span><div class="stepper" data-color="${color.id}" data-size="${size}"><button data-step="-1" ${qty === 0 ? 'disabled' : ''}>−</button><output>${qty}</output><button data-step="1" ${stock === 0 || qty >= stock ? 'disabled' : ''}>＋</button></div></div>`;
      }).join('');
      return `<section class="cart-color">
        <div class="cart-color-head">
          <label class="check"><input type="checkbox" ${count ? 'checked' : ''}><span></span></label>
          <img src="${color.image}" alt="${color.name}">
          <strong>${color.name} · ${sku} 个尺码 · ${count} 件</strong>
          <button data-expand="${color.id}" aria-expanded="${expanded}">${expanded ? '⌃' : '⌄'}</button>
        </div>
        ${expanded ? `<div class="cart-sizes">${sizeRows || '<p class="helper">该颜色尚未选择尺码</p>'}</div>` : ''}
      </section>`;
    }).join('');
    const totals = selectedTotals();
    document.querySelector('#cart-count').textContent = `已选 ${totals.skuCount} 个 SKU · ${totals.count} 件`;
    document.querySelector('#cart-total').textContent = money(totals.amount);
    document.querySelector('#remaining-limit').textContent = money(Math.max(0, MAX_CART - totals.amount)).replace('.00', '');
    document.querySelector('#home-cart-badge').textContent = totals.skuCount ? `${totals.skuCount} 款` : '购物车为空';
  }

  function openModal(html) {
    modalContent.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalContent.querySelector('input, button')?.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function showBulkModal() {
    const activeName = colors.find(c => c.id === activeColor).name;
    openModal(`<h2 id="modal-title">批量填数 · ${activeName}</h2>
      <div class="modal-form">
        <label class="radio-option"><input type="radio" name="bulk-mode" value="same" checked>每个尺码相同数量</label>
        <label class="radio-option"><input type="radio" name="bulk-mode" value="grow">按尺码递增</label>
        <label>每个尺码<input id="bulk-value" type="number" min="0" max="999" value="10" inputmode="numeric"></label>
        <label class="radio-option"><input id="skip-oos" type="checkbox" checked>跳过缺货尺码</label>
        <div class="modal-preview">将为当前颜色的 4–5 个可售尺码填入数量，超过库存时自动使用可售上限。</div>
      </div>
      <div class="modal-actions"><button class="secondary" data-action="close-modal">取消</button><button class="primary" data-action="apply-bulk">应用</button></div>`);
  }

  function applyBulk() {
    const base = Math.max(0, Number(document.querySelector('#bulk-value')?.value || 0));
    const mode = document.querySelector('input[name="bulk-mode"]:checked')?.value || 'same';
    let increment = 0;
    sizes.forEach(size => {
      const stock = inventory[activeColor][size];
      if (stock === 0) return;
      const desired = mode === 'grow' ? base + increment * 2 : base;
      quantities[activeColor][size] = Math.min(desired, stock);
      increment += 1;
    });
    closeModal();
    renderVariants();
    showToast('已完成批量填数', 'success');
  }

  function showCopyModal() {
    const source = colors.find(c => c.id === activeColor);
    const targets = colors.filter(c => c.id !== activeColor);
    openModal(`<h2 id="modal-title">复制数量到其他颜色</h2><p>把「${source.name}」各尺码数量复制到 ${targets.map(t => `「${t.name}」`).join('、')}。缺货尺码将自动跳过，超过库存的数量按可售上限填入。</p><div class="modal-preview">复制前保留目标颜色已有数量；确认后可继续逐项修改。</div><div class="modal-actions"><button class="secondary" data-action="close-modal">取消</button><button class="primary" data-action="apply-copy">确认复制</button></div>`);
  }

  function applyCopy() {
    colors.filter(c => c.id !== activeColor).forEach(color => {
      sizes.forEach(size => {
        quantities[color.id][size] = Math.min(quantities[activeColor][size], inventory[color.id][size]);
      });
    });
    closeModal();
    renderVariants();
    showToast('已复制到其他颜色', 'success');
  }

  function showSubmitModal() {
    openModal(`<h2 id="modal-title">确认提交订单？</h2><p>提交后将进入品牌审核流程。在线支付成功后锁定库存，授信或对公订单提交后即锁定库存。</p><div class="modal-actions"><button class="secondary" data-action="close-modal">取消</button><button class="primary" data-action="confirm-order">确认提交</button></div>`);
  }

  const serviceTemplates = {
    recharge: {
      title: '充值中心',
      html: `<section class="service-summary"><h2>账户余额</h2><strong class="price">¥26,800.00</strong><p class="helper">可用于订单抵扣，不可叠加活动优惠。</p></section><section class="service-form"><h2>充值金额</h2><label>金额（元）<input type="number" placeholder="请输入充值金额"></label><div class="quick-amounts"><button>¥5,000</button><button>¥10,000</button><button>¥20,000</button></div><label>充值方式<select><option>线上充值</option><option>对公充值</option></select></label><button class="primary full" data-prototype-submit="充值申请已提交">确认充值</button></section>`
    },
    bills: {
      title: '对账账单',
      html: `<section class="service-summary"><h2>2026 年 8 月账单</h2><div class="metric-grid"><div><span>应还</span><strong>¥86,320</strong></div><div><span>已还</span><strong>¥20,000</strong></div><div><span>待还</span><strong>¥66,320</strong></div></div><p class="helper">到期日：2026-08-25</p></section><section class="service-list"><h2>账单明细</h2><div class="data-row"><div><strong>PO20260810001</strong><p>08-10 · 比赛服订单</p></div><b>¥28,680</b></div><div class="data-row"><div><strong>PO20260805003</strong><p>08-05 · 羽毛球订单</p></div><b>¥18,900</b></div><button class="primary full" data-prototype-submit="已进入还款流程">立即还款</button></section>`
    },
    flow: {
      title: '资金流水',
      html: `<section class="service-list"><h2>近期资金流水</h2><div class="data-row"><div><strong>订单付款</strong><p>今天 10:32 · PO20260810001</p></div><b class="negative">−¥12,600</b></div><div class="data-row"><div><strong>充值到账</strong><p>08-20 11:08 · 线上充值</p></div><b class="positive">+¥50,000</b></div><div class="data-row"><div><strong>对账还款</strong><p>08-18 16:45</p></div><b class="negative">−¥20,000</b></div></section>`
    },
    aftersales: {
      title: '申请售后',
      html: `<section class="service-form"><h2>售后信息</h2><label>售后商品<select><option>薰风专业比赛服 T-100 · 赤焰红 L</option></select></label><label>售后类型<select><option>退货退款</option><option>仅退款</option><option>换货</option></select></label><label>退货数量<input type="number" value="1" min="1" max="10"></label><label>售后原因<select><option>商品质量问题</option><option>发错商品</option><option>其他</option></select></label><label>问题描述<textarea placeholder="请描述商品问题"></textarea></label><button class="primary full" data-prototype-submit="售后申请已提交">提交申请</button></section>`
    },
    invoice: {
      title: '发票中心',
      html: `<section class="service-summary"><div class="metric-grid"><div><span>待开票</span><strong>¥28,680</strong></div><div><span>开票中</span><strong>2 张</strong></div><div><span>已开票</span><strong>12 张</strong></div></div></section><section class="service-list"><div class="service-tabs"><button>可申请</button><button>开票中</button><button>已开票</button></div><div class="data-row"><div><strong>PO20260815001</strong><p>可开票金额 ¥12,600</p></div><button class="outline-small" data-prototype-submit="开票申请已提交">申请开票</button></div><div class="data-row"><div><strong>PO20260812002</strong><p>可开票金额 ¥8,900</p></div><button class="outline-small" data-prototype-submit="开票申请已提交">申请开票</button></div></section>`
    },
    addresses: {
      title: '收货地址',
      html: `<section class="service-list"><h2>地址管理</h2><div class="address-row"><div><strong>张先生　138 **** 5678</strong><p>备案地址 · 江苏省南京市建邺区江东中路 329 号</p></div><button class="text-button">编辑</button></div><div class="address-row"><div><strong>李先生　139 **** 2468</strong><p>历史地址 · 江苏省南京市栖霞区仙林大道 168 号</p></div><button class="text-button">编辑</button></div><button class="primary full" data-prototype-submit="已打开新增地址表单">新增地址</button></section>`
    },
    voucher: {
      title: '对公凭证',
      html: `<section class="service-summary"><h2>收款账户</h2><p>户名：薰风体育用品有限公司</p><p>开户行：招商银行股份有限公司</p><p>账号：7559 1888 1888 8888</p></section><section class="service-form"><label>转账金额<input type="number" placeholder="请输入转账金额"></label><label>转账日期<input type="date"></label><div class="upload-box">＋<br>上传转账凭证<br><small>支持 JPG、PNG、PDF</small></div><button class="primary full" data-prototype-submit="对公凭证已提交审核">提交审核</button></section>`
    },
    subaccounts: {
      title: '子账号管理',
      html: `<section class="service-list"><h2>子账号列表</h2><div class="account-row"><div><strong>张三　138 **** 1234</strong><p>权限：下单 / 查单 / 售后</p></div><span class="status success">正常</span></div><div class="account-row"><div><strong>李四　138 **** 5678</strong><p>权限：下单 / 查单</p></div><span class="status success">正常</span></div><button class="primary full" data-prototype-submit="已打开新增子账号表单">新增子账号</button></section>`
    },
    security: {
      title: '安全设置',
      html: `<section class="service-list"><h2>账号安全</h2><div class="data-row"><div><strong>修改登录密码</strong><p>建议定期更新密码</p></div><span>→</span></div><div class="data-row"><div><strong>备案手机号</strong><p>138 **** 5678</p></div><span>→</span></div><div class="data-row"><div><strong>登录设备</strong><p>3 台常用设备</p></div><span>→</span></div><div class="data-row"><div><strong>登录记录</strong><p>上次登录：南京 · 今天 09:41</p></div><span>→</span></div><button class="secondary full" data-prototype-submit="已退出其他设备">退出其他设备</button></section>`
    }
  };

  function openService(key) {
    const service = serviceTemplates[key];
    if (!service) return;
    document.querySelector('#service-title').textContent = service.title;
    document.querySelector('#service-content').innerHTML = service.html;
    navigate('service');
  }

  let toastTimer;
  function showToast(message, type = '') {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  }

  function handleStep(button) {
    const stepper = button.closest('.stepper');
    if (!stepper) return false;
    const { color, size } = stepper.dataset;
    const delta = Number(button.dataset.step);
    quantities[color][size] = Math.max(0, Math.min(inventory[color][size], quantities[color][size] + delta));
    if (currentView === 'variants') renderVariants();
    if (currentView === 'cart') renderCart();
    return true;
  }

  app.addEventListener('click', event => {
    const button = event.target.closest('button, [data-action]');
    if (!button) return;
    if (button.dataset.step && handleStep(button)) return;
    if (button.dataset.color) {
      activeColor = button.dataset.color;
      renderVariants();
      return;
    }
    if (button.dataset.expand) {
      expandedCartColors.has(button.dataset.expand) ? expandedCartColors.delete(button.dataset.expand) : expandedCartColors.add(button.dataset.expand);
      renderCart();
      return;
    }

    const action = button.dataset.action;
    const routes = { home: 'home', center: 'center', news: 'news', messages: 'messages', cart: 'cart', catalog: 'catalog', product: 'product', variants: 'variants', checkout: 'checkout', orders: 'orders', language: 'language' };
    if (routes[action]) return navigate(routes[action]);
    if (action === 'service') return openService(button.dataset.service);
    if (action === 'back') return goBack();
    if (action === 'bulk') return showBulkModal();
    if (action === 'copy-qty') return showCopyModal();
    if (action === 'close-modal') return closeModal();
    if (action === 'apply-bulk') return applyBulk();
    if (action === 'apply-copy') return applyCopy();
    if (action === 'batch-add') {
      renderCart();
      showToast('已批量加入购物车', 'success');
      return;
    }
    if (action === 'submit-order') return showSubmitModal();
    if (action === 'confirm-order') {
      closeModal();
      navigate('orders');
      showToast('订单已提交，等待品牌审核', 'success');
      return;
    }
    if (action === 'save-language') return showToast('语言设置已保存', 'success');
    if (button.dataset.prototypeSubmit) return showToast(button.dataset.prototypeSubmit, 'success');
  });

  document.querySelectorAll('.segment-tabs').forEach(group => {
    group.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      group.querySelectorAll('button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      showToast(`已切换到「${button.textContent}」`);
    });
  });

  document.querySelectorAll('.thumbnail-row button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.thumbnail-row button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      document.querySelector('.product-main-image img').src = button.querySelector('img').src;
    });
  });

  renderCart();
  renderVariants();
})();
