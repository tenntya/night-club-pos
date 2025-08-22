import React, { useMemo, useState, useMemo as useMemoAlias } from "react";

// --- Utility ---
const jpy = (n) => `¥${n.toLocaleString()}`;

// Toast
function Toast({ message, open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="rounded-xl bg-black/80 backdrop-blur px-4 py-3 border border-white/10 text-stone-100 shadow-lg">
        <div className="text-sm font-medium">{message}</div>
        <button className="mt-1 text-xs underline opacity-70 hover:opacity-100" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}

// Modal
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[700px] max-w-[92vw] rounded-2xl bg-[#1b0f12] border border-white/10 shadow-2xl">
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-stone-100 font-semibold tracking-wide text-lg">{title}</h3>
          <button className="text-stone-300 hover:text-white" onClick={onClose}>✕</button>
        </header>
        <div className="p-6 text-stone-200">{children}</div>
      </div>
    </div>
  );
}

export default function NightPosMock() {
  const color = useMemo(() => ({
    bg: "bg-[#12090c]", // wine base
    panel: "bg-[#1b0f12]",
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

  // ---- Ticket helpers ----
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
    setTickets(ts => ts.map(t => t.id === activeTicketId ? { ...t, orders: t.orders.filter(o => o.lineId !== lineId) } : t));
  }

  function newTicket() {
    const id = "T-" + Math.floor(Math.random() * 9000 + 1000);
    const ticket = { id, seat: "--", openedAt: new Date().toLocaleTimeString(), orders: [], paymentType: "現金" };
    setTickets(prev => [...prev, ticket]);
    setActiveTicketId(id);
  }

  const subtotal = activeTicket?.orders?.reduce((s, o) => s + o.price * o.qty, 0) || 0;
  const serviceAmount = Math.round(subtotal * 0.2);
  const taxAmount = Math.round((subtotal + serviceAmount) * 0.1);
  const total = subtotal + serviceAmount + taxAmount;

  // ---- Menu JSON Editor ----
  const [menuJson, setMenuJson] = useState(JSON.stringify(initialMenus, null, 2));
  const applyMenuJson = () => {
    try {
      const parsed = JSON.parse(menuJson);
      setMenus(parsed);
      setToast({ open: true, message: "メニューを反映しました" });
    } catch (e) {
      setToast({ open: true, message: `JSONエラー: ${e.message}` });
    }
  };

  return (
    <div className={`min-h-screen ${color.bg} ${color.text} antialiased`}>
      <div className="grid grid-cols-[240px_1fr] min-h-screen">
        {/* Sidebar */}
        <aside className={`hidden lg:flex flex-col border-r ${color.line} ${color.panel}`}>
          <div className="h-16 flex items-center px-5 border-b border-white/10">
            <div className="text-lg tracking-widest font-bold" style={{color: color.gold}}>ASTORIA</div>
          </div>
          <nav className="p-3 space-y-1 text-sm">
            <button onClick={newTicket} className="w-full px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5">＋ 新規伝票</button>
            <div className="mt-4 space-y-1">
              {tickets.map(t => (
                <button key={t.id} onClick={()=>setActiveTicketId(t.id)}
                  className={`w-full px-3 py-2 rounded-lg text-left transition ${activeTicketId===t.id?"bg-white/10 border border-white/20":"hover:bg-white/5 border border-transparent"}`}>
                  {t.id} <span className="opacity-60">({t.seat})</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main */}
        <section className="flex flex-col">
          {/* Topbar */}
          <header className={`h-16 flex items-center justify-between px-6 border-b ${color.line} ${color.panel}`}>
            <div className="text-sm tracking-wider opacity-80">Night POS</div>
            <div className="flex gap-6 text-sm">
              <button onClick={()=>setActiveTab("tickets")} className={`${activeTab==="tickets"?"text-yellow-400 border-b-2 border-yellow-400":"opacity-70 hover:opacity-100"}`}>伝票</button>
              <button onClick={()=>setActiveTab("dashboard")} className={`${activeTab==="dashboard"?"text-yellow-400 border-b-2 border-yellow-400":"opacity-70 hover:opacity-100"}`}>ダッシュボード</button>
              <button onClick={()=>setActiveTab("menu")} className={`${activeTab==="menu"?"text-yellow-400 border-b-2 border-yellow-400":"opacity-70 hover:opacity-100"}`}>メニュー管理</button>
              <button onClick={()=>setActiveTab("attendance")} className={`${activeTab==="attendance"?"text-yellow-400 border-b-2 border-yellow-400":"opacity-70 hover:opacity-100"}`}>勤怠管理</button>
            </div>
            <div className="text-xs opacity-70">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
          </header>

          {/* Content */}
          <main className="p-6 space-y-6">
            {/* TICKETS */}
            {activeTab === "tickets" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Menu */}
                <section className={`rounded-xl p-4 border ${color.line} ${color.panel}`}>
                  <h2 className="text-sm tracking-widest font-semibold" style={{color: color.gold}}>メニュー</h2>
                  <div className="mt-3 grid gap-2">
                    {menus.map(m => (
                      <button key={m.id} onClick={() => addOrder(m)}
                        className="group text-left rounded-lg px-3 py-2 border border-white/10 hover:border-white/20 hover:bg-white/5 transition">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">{m.category}</div>
                            <div className="font-medium">{m.name}</div>
                          </div>
                          <div className="text-right font-medium" style={{color: color.gold}}>{jpy(m.price)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Ticket Editor */}
                <section className={`rounded-xl border ${color.line} overflow-hidden ${color.panel}`}>
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-xs opacity-70">伝票ID</div>
                      <div className="font-semibold tracking-wide">{activeTicket.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-70">席</div>
                      <input value={activeTicket.seat} onChange={e=>setTickets(ts=>ts.map(t=>t.id===activeTicketId?{...t, seat:e.target.value}:t))} className="bg-transparent border-b border-white/10 text-right focus:outline-none" />
                    </div>
                  </div>

                  <div className="p-5 bg-white text-black">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">品目</th>
                          <th className="text-right py-2 w-24">単価</th>
                          <th className="text-center py-2 w-28">数量</th>
                          <th className="text-right py-2 w-28">小計</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTicket.orders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-stone-500">左のメニューから品目を追加してください</td>
                          </tr>
                        )}
                        {activeTicket.orders.map(o => (
                          <tr key={o.lineId} className="border-b last:border-0">
                            <td className="py-2">
                              <div className="font-medium">{o.name}</div>
                              <div className="text-[11px] uppercase tracking-widest opacity-60">{o.category}</div>
                            </td>
                            <td className="text-right">{jpy(o.price)}</td>
                            <td className="text-center">
                              <div className="inline-flex items-center gap-1">
                                <button onClick={()=>updateQty(o.lineId,-1)} className="w-7 h-7 rounded-md border border-stone-300 hover:bg-stone-100">−</button>
                                <div className="w-8 text-center">{o.qty}</div>
                                <button onClick={()=>updateQty(o.lineId,1)} className="w-7 h-7 rounded-md border border-stone-300 hover:bg-stone-100">＋</button>
                              </div>
                            </td>
                            <td className="text-right font-medium">{jpy(o.price*o.qty)}</td>
                            <td className="text-right">
                              <button onClick={()=>removeOrder(o.lineId)} className="text-stone-500 hover:text-black">削除</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-4 border-t border-white/10">
                    <div className="ml-auto w-full max-w-sm text-sm space-y-1">
                      <div className="flex items-center justify-between"><span>小計</span><span>{jpy(subtotal)}</span></div>
                      <div className="flex items-center justify-between"><span>サービス料 20%</span><span>{jpy(serviceAmount)}</span></div>
                      <div className="flex items-center justify-between"><span>消費税 10%</span><span>{jpy(taxAmount)}</span></div>
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10"><span className="font-semibold">合計</span><span className="text-lg font-bold" style={{color: color.gold}}>{jpy(total)}</span></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <select value={activeTicket.paymentType} onChange={e=>setTickets(ts=>ts.map(t=>t.id===activeTicketId?{...t, paymentType:e.target.value}:t))} className="bg-transparent border border-white/10 rounded-xl px-3 py-2">
                        <option className="text-black">現金</option>
                        <option className="text-black">カード</option>
                        <option className="text-black">月末請求</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={()=>setTickets(ts=>ts.map(t=>t.id===activeTicketId?{...t, orders:[]}:t))} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">取消</button>
                        <button onClick={()=>setPayOpen(true)} className="px-4 py-2 rounded-xl font-semibold shadow-sm" style={{background:"linear-gradient(180deg,#d7bd82,#C6A35E)",color:"#1b0f12"}}>会計</button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Right Sidebar */}
                <aside className={`rounded-xl p-4 border ${color.line} ${color.panel}`}>
                  <h3 className="text-sm tracking-widest font-semibold" style={{color: color.gold}}>サマリー</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between opacity-80"><span>伝票数</span><span>{tickets.length}</span></div>
                    <div className="flex items-center justify-between opacity-80"><span>注文数</span><span>{activeTicket.orders.length}</span></div>
                    <div className="flex items-center justify-between opacity-80"><span>現在合計</span><span>{jpy(total)}</span></div>
                  </div>
                </aside>
              </div>
            )}

            {/* DASHBOARD (MVP 指標) */}
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl p-6 border border-white/10 text-center">
                  <h3 className="font-semibold" style={{color: color.gold}}>本日売上</h3>
                  <p className="mt-2 text-2xl font-bold">¥123,000</p>
                </div>
                <div className="rounded-xl p-6 border border-white/10 text-center">
                  <h3 className="font-semibold" style={{color: color.gold}}>今月売上</h3>
                  <p className="mt-2 text-2xl font-bold">¥2,340,000</p>
                </div>
                <div className="rounded-xl p-6 border border-white/10 text-center">
                  <h3 className="font-semibold" style={{color: color.gold}}>客数</h3>
                  <p className="mt-2 text-2xl font-bold">54</p>
                </div>
                <div className="lg:col-span-2 rounded-xl p-6 border border-white/10">
                  <div className="text-sm opacity-80">キャスト別ランキング</div>
                  <ol className="mt-2 list-decimal pl-5 space-y-1">
                    <li>ママ - ¥45,000</li>
                    <li>まゆみさん - ¥30,000</li>
                    <li>しずなさん - ¥18,500</li>
                  </ol>
                </div>
                <div className="rounded-xl p-6 border border-white/10">
                  <div className="text-sm opacity-80">エクスポート</div>
                  <div className="mt-3 flex gap-2">
                    <button className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">PDF出力</button>
                    <button className="px-4 py-2 rounded-xl border border-white/10 hover:bg白/5 transition">CSV出力</button>
                  </div>
                </div>
              </div>
            )}

            {/* MENU (JSON マスター) */}
            {activeTab === "menu" && (
              <div className={`rounded-xl p-6 border ${color.line} ${color.panel}`}>
                <h3 className="font-semibold mb-4" style={{color: color.gold}}>メニュー管理（JSON）</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <textarea className="w-full h-80 rounded-xl p-3 bg-black/40 border border-white/10 font-mono text-sm" value={menuJson} onChange={(e)=>setMenuJson(e.target.value)} />
                  <div className="space-y-3">
                    <div className="rounded-xl p-3 bg-black/20 border border-white/10">
                      <div className="text-xs opacity-70">現在のメニュー</div>
                      <ul className="mt-2 text-sm space-y-1">
                        {menus.map(m=> (
                          <li key={m.id} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                            <span>{m.name} <span className="opacity-60">({m.category})</span></span>
                            <span style={{color: color.gold}}>{jpy(m.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={applyMenuJson} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">JSON適用</button>
                      <button onClick={()=>{ setMenuJson(JSON.stringify(initialMenus, null, 2)); setToast({open:true, message:'初期メニューを読み込みました'}); }} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">初期化</button>
                    </div>
                    <div className="text-xs opacity-70">※ MVPではUIフォーム化を予定。現在はJSON直編集で設定します。</div>
                  </div>
                </div>
              </div>
            )}

            {/* ATTENDANCE (打刻) */}
            {activeTab === "attendance" && (
              <div className={`rounded-xl p-6 border ${color.line} ${color.panel}`}>
                <h3 className="font-semibold mb-4" style={{color: color.gold}}>勤怠（打刻）</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 bg-black/20 border border-white/10">
                    <div className="text-sm opacity-80">打刻</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={()=>setToast({open:true, message:'出勤を記録しました（モック）'})} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">出勤</button>
                      <button onClick={()=>setToast({open:true, message:'退勤を記録しました（モック）'})} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">退勤</button>
                    </div>
                  </div>
                  <div className="rounded-xl p-4 bg-black/20 border border-white/10">
                    <div className="text-sm opacity-80">本日の出勤者</div>
                    <ul className="mt-2 text-sm space-y-1">
                      <li>美咲 - 18:00 ~ 0:30</li>
                      <li>葵 - 19:00 ~ 2:00</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </main>
        </section>
      </div>

      {/* Toast & Modal */}
      <Toast open={toast.open} message={toast.message} onClose={()=>setToast({open:false,message:""})} />
      <Modal open={payOpen} title="会計（モック）" onClose={()=>setPayOpen(false)}>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify_between"><span>支払方法</span><span className="font-medium">{activeTicket.paymentType}</span></div>
          <div className="flex items-center justify_between"><span>合計</span><span className="text-lg font-bold" style={{color: color.gold}}>{jpy(total)}</span></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={()=>setPayOpen(false)} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition">閉じる</button>
          <button onClick={()=>{setPayOpen(false);setToast({open:true, message:'会計を完了しました（モック）'});}} className="px-4 py-2 rounded-xl font-semibold shadow-sm" style={{background:"linear-gradient(180deg,#d7bd82,#C6A35E)",color:"#1b0f12"}}>確定</button>
        </div>
      </Modal>
    </div>
  );
}
