// ASTORIA Night Club POS System
const { useState, useMemo, useEffect } = React;
const e = React.createElement;

// ユーティリティ
const jpy = (n) => `¥${n.toLocaleString()}`;

// Toast Component
function Toast({ message, open, onClose }) {
  if (!open) return null;
  return e(
    'div',
    { className: "fixed bottom-6 right-6 z-50 toast-enter" },
    e(
      'div',
      { className: "rounded-xl bg-black/80 backdrop-blur px-4 py-3 border border-white/10 text-stone-100 shadow-lg" },
      e('div', { className: "text-sm font-medium" }, message),
      e('button', { 
        className: "mt-1 text-xs underline opacity-70 hover:opacity-100",
        onClick: onClose 
      }, "閉じる")
    )
  );
}

// Modal Component
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return e(
    'div',
    { className: "fixed inset-0 z-40 flex items-center justify-center" },
    e('div', { 
      className: "absolute inset-0 bg-black/50 modal-backdrop",
      onClick: onClose 
    }),
    e(
      'div',
      { className: "relative w-[700px] max-w-[92vw] rounded-2xl bg-wine-800 border border-white/10 shadow-2xl modal-content" },
      e(
        'header',
        { className: "px-6 py-4 border-b border-white/10 flex items-center justify-between" },
        e('h3', { className: "text-stone-100 font-semibold tracking-wide text-lg" }, title),
        e('button', { 
          className: "text-stone-300 hover:text-white",
          onClick: onClose 
        }, "✕")
      ),
      e('div', { className: "p-6 text-stone-200" }, children)
    )
  );
}

// Main App Component  
function NightPosMock() {
  const color = useMemo(() => ({
    bg: "bg-wine-900",
    panel: "bg-wine-800",
    gold: "#C6A35E",
    line: "border-white/10",
    text: "text-stone-100"
  }), []);

  const initialMenus = [
    { id: "set_regular_60", category: "set", name: "レギュラー60", price: 6000 },
    { id: "drink_beer", category: "drink", name: "生ビール", price: 800 },
    { id: "drink_shochu", category: "drink", name: "芋焼酎(ロック)", price: 900 },
    { id: "bottle_x", category: "bottle", name: "ボトルX", price: 15000 },
    { id: "nomination_one", category: "nomination", name: "本指名", price: 3000 }
  ];

  // 複数伝票管理
  const [tickets, setTickets] = useState([
    { id: "T-0001", seat: "A-1", openedAt: new Date().toLocaleTimeString(), orders: [], paymentType: "現金" }
  ]);
  const [activeTicketId, setActiveTicketId] = useState("T-0001");
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];

  const [menus, setMenus] = useState(initialMenus);
  const [toast, setToast] = useState({open: false, message: ""});
  const [payOpen, setPayOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");

  // Ticket helpers
  function addOrder(menu) {
    setTickets(ts => ts.map(t => t.id === activeTicketId ? {
      ...t,
      orders: [...t.orders, { ...menu, qty: 1, lineId: Math.random().toString(36).slice(2, 8) }]
    } : t));
    setToast({ open: true, message: `${menu.name} を追加しました` });
  }

  function updateQty(lineId, delta) {
    setTickets(ts => ts.map(t => t.id === activeTicketId ? {
      ...t,
      orders: t.orders.map(o => o.lineId === lineId ? { ...o, qty: Math.max(1, o.qty + delta) } : o)
    } : t));
  }

  function removeOrder(lineId) {
    setTickets(ts => ts.map(t => t.id === activeTicketId ? { 
      ...t, 
      orders: t.orders.filter(o => o.lineId !== lineId) 
    } : t));
  }

  function newTicket() {
    const id = "T-" + Math.floor(Math.random() * 9000 + 1000);
    const ticket = { 
      id, 
      seat: "--", 
      openedAt: new Date().toLocaleTimeString(), 
      orders: [], 
      paymentType: "現金" 
    };
    setTickets(prev => [...prev, ticket]);
    setActiveTicketId(id);
  }

  function updateSeat(value) {
    setTickets(ts => ts.map(t => t.id === activeTicketId ? {...t, seat: value} : t));
  }

  function updatePaymentType(value) {
    setTickets(ts => ts.map(t => t.id === activeTicketId ? {...t, paymentType: value} : t));
  }

  function clearOrders() {
    setTickets(ts => ts.map(t => t.id === activeTicketId ? {...t, orders: []} : t));
  }

  const subtotal = activeTicket?.orders?.reduce((s, o) => s + o.price * o.qty, 0) || 0;
  const serviceAmount = Math.round(subtotal * 0.2);
  const taxAmount = Math.round((subtotal + serviceAmount) * 0.1);
  const total = subtotal + serviceAmount + taxAmount;

  // Menu JSON Editor
  const [menuJson, setMenuJson] = useState(JSON.stringify(initialMenus, null, 2));
  const applyMenuJson = () => {
    try {
      const parsed = JSON.parse(menuJson);
      setMenus(parsed);
      setToast({ open: true, message: "メニューを反映しました" });
    } catch (err) {
      setToast({ open: true, message: `JSONエラー: ${err.message}` });
    }
  };

  // Render Tabs
  const renderTickets = () => e(
    'div',
    { className: "grid grid-cols-1 xl:grid-cols-3 gap-6" },
    // Menu Panel
    e(
      'section',
      { className: `rounded-xl p-4 border ${color.line} ${color.panel}` },
      e('h2', { 
        className: "text-sm tracking-widest font-semibold",
        style: {color: color.gold} 
      }, "メニュー"),
      e(
        'div',
        { className: "mt-3 grid gap-2" },
        menus.map(m => e(
          'button',
          {
            key: m.id,
            onClick: () => addOrder(m),
            className: "group text-left rounded-lg px-3 py-2 border border-white/10 hover:border-white/20 hover:bg-white/5 transition"
          },
          e(
            'div',
            { className: "flex items-center justify-between" },
            e(
              'div',
              null,
              e('div', { className: "text-[11px] uppercase tracking-[0.2em] opacity-60" }, m.category),
              e('div', { className: "font-medium" }, m.name)
            ),
            e('div', { 
              className: "text-right font-medium",
              style: {color: color.gold} 
            }, jpy(m.price))
          )
        ))
      )
    ),
    // Ticket Editor
    e(
      'section',
      { className: `rounded-xl border ${color.line} overflow-hidden ${color.panel}` },
      e(
        'div',
        { className: "px-5 py-4 border-b border-white/10 flex items-center justify-between" },
        e(
          'div',
          null,
          e('div', { className: "text-xs opacity-70" }, "伝票ID"),
          e('div', { className: "font-semibold tracking-wide" }, activeTicket.id)
        ),
        e(
          'div',
          { className: "text-right" },
          e('div', { className: "text-xs opacity-70" }, "席"),
          e('input', {
            value: activeTicket.seat,
            onChange: ev => updateSeat(ev.target.value),
            className: "bg-transparent border-b border-white/10 text-right focus:outline-none w-20"
          })
        )
      ),
      e(
        'div',
        { className: "p-5 bg-white text-black receipt-table" },
        e(
          'table',
          { className: "w-full text-sm" },
          e(
            'thead',
            null,
            e(
              'tr',
              { className: "border-b" },
              e('th', { className: "text-left py-2" }, "品目"),
              e('th', { className: "text-right py-2 w-24" }, "単価"),
              e('th', { className: "text-center py-2 w-28" }, "数量"),
              e('th', { className: "text-right py-2 w-28" }, "小計"),
              e('th', { className: "w-10" })
            )
          ),
          e(
            'tbody',
            null,
            activeTicket.orders.length === 0 && e(
              'tr',
              null,
              e('td', { 
                colSpan: 5,
                className: "py-6 text-center text-stone-500" 
              }, "左のメニューから品目を追加してください")
            ),
            activeTicket.orders.map(o => e(
              'tr',
              { key: o.lineId, className: "border-b last:border-0" },
              e(
                'td',
                { className: "py-2" },
                e('div', { className: "font-medium" }, o.name),
                e('div', { className: "text-[11px] uppercase tracking-widest opacity-60" }, o.category)
              ),
              e('td', { className: "text-right" }, jpy(o.price)),
              e(
                'td',
                { className: "text-center" },
                e(
                  'div',
                  { className: "inline-flex items-center gap-1" },
                  e('button', {
                    onClick: () => updateQty(o.lineId, -1),
                    className: "w-7 h-7 rounded-md border border-stone-300 hover:bg-stone-100"
                  }, "−"),
                  e('div', { className: "w-8 text-center" }, o.qty),
                  e('button', {
                    onClick: () => updateQty(o.lineId, 1),
                    className: "w-7 h-7 rounded-md border border-stone-300 hover:bg-stone-100"
                  }, "＋")
                )
              ),
              e('td', { className: "text-right font-medium" }, jpy(o.price * o.qty)),
              e(
                'td',
                { className: "text-right" },
                e('button', {
                  onClick: () => removeOrder(o.lineId),
                  className: "text-stone-500 hover:text-black text-sm"
                }, "削除")
              )
            ))
          )
        )
      ),
      e(
        'div',
        { className: "px-5 py-4 border-t border-white/10" },
        e(
          'div',
          { className: "ml-auto w-full max-w-sm text-sm space-y-1" },
          e('div', { className: "flex items-center justify-between" }, 
            e('span', null, "小計"),
            e('span', null, jpy(subtotal))
          ),
          e('div', { className: "flex items-center justify-between" },
            e('span', null, "サービス料 20%"),
            e('span', null, jpy(serviceAmount))
          ),
          e('div', { className: "flex items-center justify-between" },
            e('span', null, "消費税 10%"),
            e('span', null, jpy(taxAmount))
          ),
          e('div', { className: "flex items-center justify-between pt-2 mt-1 border-t border-white/10" },
            e('span', { className: "font-semibold" }, "合計"),
            e('span', { 
              className: "text-lg font-bold",
              style: {color: color.gold} 
            }, jpy(total))
          )
        ),
        e(
          'div',
          { className: "mt-4 flex items-center justify-between" },
          e('select', {
            value: activeTicket.paymentType,
            onChange: ev => updatePaymentType(ev.target.value),
            className: "bg-transparent border border-white/10 rounded-xl px-3 py-2 text-stone-100"
          },
            e('option', { className: "text-black" }, "現金"),
            e('option', { className: "text-black" }, "カード"),
            e('option', { className: "text-black" }, "月末請求")
          ),
          e(
            'div',
            { className: "flex gap-2" },
            e('button', {
              onClick: clearOrders,
              className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
            }, "取消"),
            e('button', {
              onClick: () => setPayOpen(true),
              className: "px-4 py-2 rounded-xl font-semibold shadow-sm btn-gold-gradient"
            }, "会計")
          )
        )
      )
    ),
    // Summary Panel
    e(
      'aside',
      { className: `rounded-xl p-4 border ${color.line} ${color.panel}` },
      e('h3', { 
        className: "text-sm tracking-widest font-semibold",
        style: {color: color.gold} 
      }, "サマリー"),
      e(
        'div',
        { className: "mt-3 space-y-2 text-sm" },
        e('div', { className: "flex items-center justify-between opacity-80" },
          e('span', null, "伝票数"),
          e('span', null, tickets.length)
        ),
        e('div', { className: "flex items-center justify-between opacity-80" },
          e('span', null, "注文数"),
          e('span', null, activeTicket.orders.length)
        ),
        e('div', { className: "flex items-center justify-between opacity-80" },
          e('span', null, "現在合計"),
          e('span', null, jpy(total))
        )
      )
    )
  );

  const renderDashboard = () => e(
    'div',
    { className: "grid grid-cols-1 lg:grid-cols-3 gap-6" },
    e(
      'div',
      { className: "rounded-xl p-6 border border-white/10 text-center" },
      e('h3', { className: "font-semibold", style: {color: color.gold} }, "本日売上"),
      e('p', { className: "mt-2 text-2xl font-bold" }, "¥123,000")
    ),
    e(
      'div',
      { className: "rounded-xl p-6 border border-white/10 text-center" },
      e('h3', { className: "font-semibold", style: {color: color.gold} }, "今月売上"),
      e('p', { className: "mt-2 text-2xl font-bold" }, "¥2,340,000")
    ),
    e(
      'div',
      { className: "rounded-xl p-6 border border-white/10 text-center" },
      e('h3', { className: "font-semibold", style: {color: color.gold} }, "客数"),
      e('p', { className: "mt-2 text-2xl font-bold" }, "54")
    ),
    e(
      'div',
      { className: "lg:col-span-2 rounded-xl p-6 border border-white/10" },
      e('div', { className: "text-sm opacity-80" }, "キャスト別ランキング"),
      e(
        'ol',
        { className: "mt-2 list-decimal pl-5 space-y-1" },
        e('li', null, "ママ - ¥45,000"),
        e('li', null, "まゆみさん - ¥30,000"),
        e('li', null, "しずなさん - ¥18,500")
      )
    ),
    e(
      'div',
      { className: "rounded-xl p-6 border border-white/10" },
      e('div', { className: "text-sm opacity-80" }, "エクスポート"),
      e(
        'div',
        { className: "mt-3 flex gap-2" },
        e('button', { className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" }, "PDF出力"),
        e('button', { className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" }, "CSV出力")
      )
    )
  );

  const renderMenu = () => e(
    'div',
    { className: `rounded-xl p-6 border ${color.line} ${color.panel}` },
    e('h3', { 
      className: "font-semibold mb-4",
      style: {color: color.gold} 
    }, "メニュー管理（JSON）"),
    e(
      'div',
      { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" },
      e('textarea', {
        className: "w-full h-80 rounded-xl p-3 bg-black/40 border border-white/10 font-mono text-sm",
        value: menuJson,
        onChange: ev => setMenuJson(ev.target.value)
      }),
      e(
        'div',
        { className: "space-y-3" },
        e(
          'div',
          { className: "rounded-xl p-3 bg-black/20 border border-white/10" },
          e('div', { className: "text-xs opacity-70" }, "現在のメニュー"),
          e(
            'ul',
            { className: "mt-2 text-sm space-y-1" },
            menus.map(m => e(
              'li',
              { key: m.id, className: "flex justify-between py-1 border-b border-white/5 last:border-0" },
              e('span', null, m.name, e('span', { className: "opacity-60" }, ` (${m.category})`)),
              e('span', { style: {color: color.gold} }, jpy(m.price))
            ))
          )
        ),
        e(
          'div',
          { className: "flex gap-2" },
          e('button', {
            onClick: applyMenuJson,
            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
          }, "JSON適用"),
          e('button', {
            onClick: () => {
              setMenuJson(JSON.stringify(initialMenus, null, 2));
              setToast({open: true, message: '初期メニューを読み込みました'});
            },
            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
          }, "初期化")
        ),
        e('div', { className: "text-xs opacity-70" }, "※ MVPではUIフォーム化を予定。現在はJSON直編集で設定します。")
      )
    )
  );

  const renderAttendance = () => e(
    'div',
    { className: `rounded-xl p-6 border ${color.line} ${color.panel}` },
    e('h3', { 
      className: "font-semibold mb-4",
      style: {color: color.gold} 
    }, "勤怠（打刻）"),
    e(
      'div',
      { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" },
      e(
        'div',
        { className: "rounded-xl p-4 bg-black/20 border border-white/10" },
        e('div', { className: "text-sm opacity-80" }, "打刻"),
        e(
          'div',
          { className: "mt-2 flex gap-2" },
          e('button', {
            onClick: () => setToast({open: true, message: '出勤を記録しました（モック）'}),
            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
          }, "出勤"),
          e('button', {
            onClick: () => setToast({open: true, message: '退勤を記録しました（モック）'}),
            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
          }, "退勤")
        )
      ),
      e(
        'div',
        { className: "rounded-xl p-4 bg-black/20 border border-white/10" },
        e('div', { className: "text-sm opacity-80" }, "本日の出勤者"),
        e(
          'ul',
          { className: "mt-2 text-sm space-y-1" },
          e('li', null, "美咲 - 18:00 ~ 0:30"),
          e('li', null, "葵 - 19:00 ~ 2:00")
        )
      )
    )
  );

  return e(
    'div',
    { className: `min-h-screen ${color.bg} ${color.text} antialiased` },
    e(
      'div',
      { className: "grid grid-cols-[240px_1fr] min-h-screen" },
      // Sidebar
      e(
        'aside',
        { className: `hidden lg:flex flex-col border-r ${color.line} ${color.panel} sidebar` },
        e(
          'div',
          { className: "h-16 flex items-center px-5 border-b border-white/10" },
          e('div', { 
            className: "text-lg tracking-widest font-bold",
            style: {color: color.gold} 
          }, "ASTORIA")
        ),
        e(
          'nav',
          { className: "p-3 space-y-1 text-sm" },
          e('button', {
            onClick: newTicket,
            className: "w-full px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5"
          }, "＋ 新規伝票"),
          e(
            'div',
            { className: "mt-4 space-y-1" },
            tickets.map(t => e(
              'button',
              {
                key: t.id,
                onClick: () => setActiveTicketId(t.id),
                className: `w-full px-3 py-2 rounded-lg text-left transition ${
                  activeTicketId === t.id 
                    ? "bg-white/10 border border-white/20" 
                    : "hover:bg-white/5 border border-transparent"
                }`
              },
              t.id,
              e('span', { className: "opacity-60" }, ` (${t.seat})`)
            ))
          )
        )
      ),
      // Main Section
      e(
        'section',
        { className: "flex flex-col" },
        // Topbar
        e(
          'header',
          { className: `h-16 flex items-center justify-between px-6 border-b ${color.line} ${color.panel}` },
          e('div', { className: "text-sm tracking-wider opacity-80" }, "Night POS"),
          e(
            'div',
            { className: "flex gap-6 text-sm" },
            e('button', {
              onClick: () => setActiveTab("tickets"),
              className: activeTab === "tickets" ? "tab-active" : "opacity-70 hover:opacity-100"
            }, "伝票"),
            e('button', {
              onClick: () => setActiveTab("dashboard"),
              className: activeTab === "dashboard" ? "tab-active" : "opacity-70 hover:opacity-100"
            }, "ダッシュボード"),
            e('button', {
              onClick: () => setActiveTab("menu"),
              className: activeTab === "menu" ? "tab-active" : "opacity-70 hover:opacity-100"
            }, "メニュー管理"),
            e('button', {
              onClick: () => setActiveTab("attendance"),
              className: activeTab === "attendance" ? "tab-active" : "opacity-70 hover:opacity-100"
            }, "勤怠管理")
          ),
          e('div', { className: "text-xs opacity-70" }, 
            new Date().toLocaleDateString(),
            " ",
            new Date().toLocaleTimeString()
          )
        ),
        // Content
        e(
          'main',
          { className: "p-6 space-y-6" },
          activeTab === "tickets" && renderTickets(),
          activeTab === "dashboard" && renderDashboard(),
          activeTab === "menu" && renderMenu(),
          activeTab === "attendance" && renderAttendance()
        )
      )
    ),
    // Toast & Modal
    e(Toast, {
      open: toast.open,
      message: toast.message,
      onClose: () => setToast({open: false, message: ""})
    }),
    e(
      Modal,
      {
        open: payOpen,
        title: "会計（モック）",
        onClose: () => setPayOpen(false)
      },
      e(
        'div',
        { className: "space-y-2 text-sm" },
        e('div', { className: "flex items-center justify-between" },
          e('span', null, "支払方法"),
          e('span', { className: "font-medium" }, activeTicket.paymentType)
        ),
        e('div', { className: "flex items-center justify-between" },
          e('span', null, "合計"),
          e('span', { 
            className: "text-lg font-bold",
            style: {color: color.gold} 
          }, jpy(total))
        )
      ),
      e(
        'div',
        { className: "mt-4 flex justify-end gap-2" },
        e('button', {
          onClick: () => setPayOpen(false),
          className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
        }, "閉じる"),
        e('button', {
          onClick: () => {
            setPayOpen(false);
            setToast({open: true, message: '会計を完了しました（モック）'});
          },
          className: "px-4 py-2 rounded-xl font-semibold shadow-sm btn-gold-gradient"
        }, "確定")
      )
    )
  );
}

// アプリケーションのレンダリング
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(NightPosMock));