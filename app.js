// ASTORIA Night Club POS System
(function() {
    'use strict';
    
    const { useState, useMemo, useEffect } = React;
    const e = React.createElement;
    
    // ===== Helpers =====
    const jpy = (n) => `¥${n.toLocaleString()}`;
    
    // 採番ユーティリティ（T-YYYYMMDD-###：当日内連番）
    const todayYYYYMMDD = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}${mm}${dd}`;
    };
    
    const nextTicketId = (tickets) => {
        const today = todayYYYYMMDD();
        const prefix = `T-${today}-`;
        let max = 0;
        (tickets || []).forEach((t) => {
            if (t && typeof t.id === "string" && t.id.startsWith(prefix)) {
                const num = parseInt(t.id.slice(prefix.length), 10);
                if (!Number.isNaN(num)) max = Math.max(max, num);
            }
        });
        const next = String(max + 1).padStart(3, "0");
        return `${prefix}${next}`;
    };
    
    // 会計時の確認（来店者名が未入力なら確認が必要）
    const needsConfirmOnPay = (name) => !String(name || "").trim().length;
    
    // ===== UI Primitives =====
    function Toast({ message, open, onClose }) {
        if (!open) return null;
        return e('div', { className: "fixed bottom-6 right-6 z-50" },
            e('div', { className: "rounded-xl bg-black/80 backdrop-blur px-4 py-3 border border-white/10 text-stone-100 shadow-lg" },
                e('div', { className: "text-sm font-medium" }, message),
                e('button', { 
                    className: "mt-1 text-xs underline opacity-70 hover:opacity-100",
                    onClick: onClose 
                }, '閉じる')
            )
        );
    }
    
    function Modal({ open, title, children, onClose }) {
        if (!open) return null;
        return e('div', { className: "fixed inset-0 z-40 flex items-center justify-center" },
            e('div', { 
                className: "absolute inset-0 bg-black/50",
                onClick: onClose 
            }),
            e('div', { className: "relative w-[700px] max-w-[92vw] rounded-2xl bg-[#1b0f12] border border-white/10 shadow-2xl" },
                e('header', { className: "px-6 py-4 border-b border-white/10 flex items-center justify-between" },
                    e('h3', { className: "text-stone-100 font-semibold tracking-wide text-lg" }, title),
                    e('button', { 
                        className: "text-stone-300 hover:text-white",
                        onClick: onClose 
                    }, '✕')
                ),
                e('div', { className: "p-6 text-stone-200" }, children)
            )
        );
    }
    
    function NightPosMock() {
        const color = useMemo(() => ({
            bg: "bg-[#12090c]",
            panel: "bg-[#1b0f12]",
            gold: "#C6A35E",
            line: "border-white/10",
            text: "text-stone-100",
        }), []);
        
        const initialMenus = [
            { id: "set_regular_60", category: "set", name: "レギュラー60", price: 6000 },
            { id: "drink_beer", category: "drink", name: "生ビール", price: 800 },
            { id: "drink_shochu", category: "drink", name: "芋焼酎(ロック)", price: 900 },
            { id: "bottle_x", category: "bottle", name: "ボトルX", price: 15000 },
            { id: "nomination_one", category: "nomination", name: "本指名", price: 3000 },
        ];
        
        // ===== 複数伝票管理（採番: T-YYYYMMDD-###） =====
        const [tickets, setTickets] = useState(() => [
            { 
                id: nextTicketId([]), 
                seat: "A-1", 
                openedAt: new Date().toLocaleTimeString(), 
                orders: [], 
                paymentType: "現金", 
                customerName: "", 
                isNewGuest: false, 
                customerMemo: "" 
            }
        ]);
        const [activeTicketId, setActiveTicketId] = useState(() => 
            (Array.isArray(tickets) && tickets[0] ? tickets[0].id : "")
        );
        const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];
        
        const [menus, setMenus] = useState(initialMenus);
        const [toast, setToast] = useState({ open: false, message: "" });
        const [payOpen, setPayOpen] = useState(false);
        const [activeTab, setActiveTab] = useState("tickets");
        
        // ---- Ticket helpers ----
        function addOrder(menu) {
            setTickets((ts) => ts.map((t) => (t.id === activeTicketId
                ? { ...t, orders: [...t.orders, { ...menu, qty: 1, lineId: Math.random().toString(36).slice(2, 8) }] }
                : t)));
            setToast({ open: true, message: `${menu.name} を追加しました` });
        }
        
        function updateQty(lineId, delta) {
            setTickets((ts) => ts.map((t) => (t.id === activeTicketId
                ? { ...t, orders: t.orders.map((o) => (o.lineId === lineId ? { ...o, qty: Math.max(1, o.qty + delta) } : o)) }
                : t)));
        }
        
        function removeOrder(lineId) {
            setTickets((ts) => ts.map((t) => (t.id === activeTicketId
                ? { ...t, orders: t.orders.filter((o) => o.lineId !== lineId) }
                : t)));
        }
        
        function newTicket() {
            const id = nextTicketId(tickets);
            const ticket = { 
                id, 
                seat: "--", 
                openedAt: new Date().toLocaleTimeString(), 
                orders: [], 
                paymentType: "現金", 
                customerName: "", 
                isNewGuest: false, 
                customerMemo: "" 
            };
            setTickets((prev) => [...prev, ticket]);
            setActiveTicketId(id);
        }
        
        const subtotal = (activeTicket?.orders || []).reduce((s, o) => s + o.price * o.qty, 0);
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
            } catch (err) {
                setToast({ open: true, message: `JSONエラー: ${err.message}` });
            }
        };
        
        return e('div', { className: `min-h-screen ${color.bg} ${color.text} antialiased` },
            e('div', { className: "grid grid-cols-[240px_1fr] min-h-screen" },
                // Sidebar
                e('aside', { className: `hidden lg:flex flex-col border-r ${color.line} ${color.panel}` },
                    e('div', { className: "h-16 flex items-center px-5 border-b border-white/10" },
                        e('div', { 
                            className: "text-lg tracking-widest font-bold",
                            style: { color: color.gold }
                        }, 'ASTORIA')
                    ),
                    e('nav', { className: "p-3 space-y-1 text-sm" },
                        e('button', { 
                            onClick: newTicket,
                            className: "w-full px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5" 
                        }, '＋ 新規伝票'),
                        e('div', { className: "mt-4 space-y-1" },
                            tickets.map((t) => 
                                e('button', {
                                    key: t.id,
                                    onClick: () => setActiveTicketId(t.id),
                                    className: `w-full px-3 py-2 rounded-lg text-left transition ${
                                        activeTicketId === t.id 
                                            ? "bg-white/10 border border-white/20" 
                                            : "hover:bg-white/5 border border-transparent"
                                    }`
                                },
                                    e('div', { className: "flex flex-col" },
                                        e('span', null, 
                                            t.id, 
                                            e('span', { className: "opacity-60" }, ` (${t.seat})`)
                                        ),
                                        e('span', { className: "text-xs opacity-70" },
                                            t.customerName ? t.customerName : (t.isNewGuest ? "新規様（名前未取得）" : "—")
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                
                // Main
                e('section', { className: "flex flex-col" },
                    // Topbar
                    e('header', { className: `h-16 flex items-center justify-between px-6 border-b ${color.line} ${color.panel}` },
                        e('div', { className: "text-sm tracking-wider opacity-80" }, 'Night POS'),
                        e('div', { className: "flex gap-6 text-sm" },
                            e('button', { 
                                onClick: () => setActiveTab("tickets"),
                                className: activeTab === "tickets" 
                                    ? "text-yellow-400 border-b-2 border-yellow-400" 
                                    : "opacity-70 hover:opacity-100"
                            }, '伝票'),
                            e('button', { 
                                onClick: () => setActiveTab("dashboard"),
                                className: activeTab === "dashboard" 
                                    ? "text-yellow-400 border-b-2 border-yellow-400" 
                                    : "opacity-70 hover:opacity-100"
                            }, 'ダッシュボード'),
                            e('button', { 
                                onClick: () => setActiveTab("menu"),
                                className: activeTab === "menu" 
                                    ? "text-yellow-400 border-b-2 border-yellow-400" 
                                    : "opacity-70 hover:opacity-100"
                            }, 'メニュー管理'),
                            e('button', { 
                                onClick: () => setActiveTab("attendance"),
                                className: activeTab === "attendance" 
                                    ? "text-yellow-400 border-b-2 border-yellow-400" 
                                    : "opacity-70 hover:opacity-100"
                            }, '勤怠管理')
                        ),
                        e('div', { className: "text-xs opacity-70" }, 
                            new Date().toLocaleDateString(), ' ', new Date().toLocaleTimeString()
                        )
                    ),
                    
                    // Content
                    e('main', { className: "p-6 space-y-6" },
                        // TICKETS
                        activeTab === "tickets" && e('div', { className: "grid grid-cols-1 xl:grid-cols-3 gap-6" },
                            // Menu
                            e('section', { className: `rounded-xl p-4 border ${color.line} ${color.panel}` },
                                e('h2', { 
                                    className: "text-sm tracking-widest font-semibold",
                                    style: { color: color.gold }
                                }, 'メニュー'),
                                e('div', { className: "mt-3 grid gap-2" },
                                    menus.map((m) => 
                                        e('button', {
                                            key: m.id,
                                            onClick: () => addOrder(m),
                                            className: "group text-left rounded-lg px-3 py-2 border border-white/10 hover:border-white/20 hover:bg-white/5 transition"
                                        },
                                            e('div', { className: "flex items-center justify-between" },
                                                e('div', null,
                                                    e('div', { className: "text-[11px] uppercase tracking-[0.2em] opacity-60" }, m.category),
                                                    e('div', { className: "font-medium" }, m.name)
                                                ),
                                                e('div', { 
                                                    className: "text-right font-medium",
                                                    style: { color: color.gold }
                                                }, jpy(m.price))
                                            )
                                        )
                                    )
                                )
                            ),
                            
                            // Ticket Editor
                            e('section', { className: `rounded-xl border ${color.line} overflow-hidden ${color.panel}` },
                                e('div', { className: "px-5 py-4 border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-center" },
                                    e('div', null,
                                        e('div', { className: "text-xs opacity-70" }, '伝票ID'),
                                        e('div', { className: "font-semibold tracking-wide" }, activeTicket.id)
                                    ),
                                    e('div', { className: "text-left md:text-center" },
                                        e('div', { className: "text-xs opacity-70" }, '席'),
                                        e('input', {
                                            value: activeTicket.seat,
                                            onChange: (evt) => setTickets((ts) => ts.map((t) => 
                                                (t.id === activeTicketId ? { ...t, seat: evt.target.value } : t)
                                            )),
                                            className: "bg-transparent border-b border-white/10 focus:outline-none text-left md:text-center"
                                        })
                                    ),
                                    // 顧客情報
                                    e('div', { className: "text-left md:text-right" },
                                        e('div', { className: "text-xs opacity-70" }, '来店者'),
                                        e('div', { className: "flex items-center gap-2 justify-end" },
                                            e('input', {
                                                type: "text",
                                                placeholder: activeTicket.isNewGuest ? "（後で入力）" : "名前を入力",
                                                value: activeTicket.customerName,
                                                onChange: (evt) => setTickets((ts) => ts.map((t) => 
                                                    (t.id === activeTicketId ? { ...t, customerName: evt.target.value } : t)
                                                )),
                                                className: "bg-transparent border-b border-white/10 focus:outline-none w-40"
                                            }),
                                            e('label', { className: "inline-flex items-center gap-1 text-xs opacity-80" },
                                                e('input', {
                                                    type: "checkbox",
                                                    checked: activeTicket.isNewGuest,
                                                    onChange: (evt) => setTickets((ts) => ts.map((t) => 
                                                        (t.id === activeTicketId ? { ...t, isNewGuest: evt.target.checked } : t)
                                                    ))
                                                }),
                                                '新規'
                                            )
                                        ),
                                        activeTicket.isNewGuest && e('textarea', {
                                            placeholder: "メモ（特徴・同伴元など）",
                                            value: activeTicket.customerMemo,
                                            onChange: (evt) => setTickets((ts) => ts.map((t) => 
                                                (t.id === activeTicketId ? { ...t, customerMemo: evt.target.value } : t)
                                            )),
                                            className: "mt-2 w-full md:w-72 h-16 bg-[#1b0f12] border border-white/10 rounded-lg p-2 text-sm"
                                        })
                                    )
                                ),
                                
                                e('div', { className: `p-5 ${color.panel} ${color.text}` },
                                    e('table', { className: "w-full text-sm" },
                                        e('thead', null,
                                            e('tr', { className: "border-b border-white/10" },
                                                e('th', { className: "text-left py-2" }, '品目'),
                                                e('th', { className: "text-right py-2 w-24" }, '単価'),
                                                e('th', { className: "text-center py-2 w-28" }, '数量'),
                                                e('th', { className: "text-right py-2 w-28" }, '小計'),
                                                e('th', { className: "w-10" })
                                            )
                                        ),
                                        e('tbody', null,
                                            activeTicket.orders.length === 0 && e('tr', null,
                                                e('td', { colSpan: 5, className: "py-6 text-center opacity-60" }, 
                                                    '左のメニューから品目を追加してください'
                                                )
                                            ),
                                            activeTicket.orders.map((o) => 
                                                e('tr', { key: o.lineId, className: "border-b border-white/10 last:border-0" },
                                                    e('td', { className: "py-2" },
                                                        e('div', { className: "font-medium" }, o.name),
                                                        e('div', { className: "text-[11px] uppercase tracking-widest opacity-60" }, o.category)
                                                    ),
                                                    e('td', { className: "text-right" }, jpy(o.price)),
                                                    e('td', { className: "text-center" },
                                                        e('div', { className: "inline-flex items-center gap-1" },
                                                            e('button', { 
                                                                onClick: () => updateQty(o.lineId, -1),
                                                                className: "w-7 h-7 rounded-md border border-white/10 hover:bg-white/5" 
                                                            }, '−'),
                                                            e('div', { className: "w-8 text-center" }, o.qty),
                                                            e('button', { 
                                                                onClick: () => updateQty(o.lineId, 1),
                                                                className: "w-7 h-7 rounded-md border border-white/10 hover:bg-white/5" 
                                                            }, '＋')
                                                        )
                                                    ),
                                                    e('td', { className: "text-right font-medium" }, jpy(o.price * o.qty)),
                                                    e('td', { className: "text-right" },
                                                        e('button', { 
                                                            onClick: () => removeOrder(o.lineId),
                                                            className: "text-stone-400 hover:text-white" 
                                                        }, '削除')
                                                    )
                                                )
                                            )
                                        )
                                    )
                                ),
                                
                                e('div', { className: "px-5 py-4 border-t border-white/10" },
                                    e('div', { className: "ml-auto w-full max-w-sm text-sm space-y-1" },
                                        e('div', { className: "flex items-center justify-between" },
                                            e('span', null, '小計'),
                                            e('span', null, jpy(subtotal))
                                        ),
                                        e('div', { className: "flex items-center justify-between" },
                                            e('span', null, 'サービス料 20%'),
                                            e('span', null, jpy(serviceAmount))
                                        ),
                                        e('div', { className: "flex items-center justify-between" },
                                            e('span', null, '消費税 10%'),
                                            e('span', null, jpy(taxAmount))
                                        ),
                                        e('div', { className: "flex items-center justify-between pt-2 mt-1 border-t border-white/10" },
                                            e('span', { className: "font-semibold" }, '合計'),
                                            e('span', { 
                                                className: "text-lg font-bold",
                                                style: { color: color.gold }
                                            }, jpy(total))
                                        )
                                    ),
                                    e('div', { className: "mt-4 flex items-center justify-between" },
                                        e('select', {
                                            value: activeTicket.paymentType,
                                            onChange: (evt) => setTickets((ts) => ts.map((t) => 
                                                (t.id === activeTicketId ? { ...t, paymentType: evt.target.value } : t)
                                            )),
                                            className: "bg-transparent border border-white/10 rounded-xl px-3 py-2"
                                        },
                                            e('option', { className: "text-black" }, '現金'),
                                            e('option', { className: "text-black" }, 'カード'),
                                            e('option', { className: "text-black" }, '月末請求')
                                        ),
                                        e('div', { className: "flex gap-2" },
                                            e('button', { 
                                                onClick: () => setTickets((ts) => ts.map((t) => 
                                                    (t.id === activeTicketId ? { ...t, orders: [] } : t)
                                                )),
                                                className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" 
                                            }, '取消'),
                                            e('button', { 
                                                onClick: () => setPayOpen(true),
                                                className: "px-4 py-2 rounded-xl font-semibold shadow-sm",
                                                style: { 
                                                    background: "linear-gradient(180deg,#d7bd82,#C6A35E)", 
                                                    color: "#1b0f12" 
                                                }
                                            }, '会計')
                                        )
                                    )
                                )
                            ),
                            
                            // Right Sidebar
                            e('aside', { className: `rounded-xl p-4 border ${color.line} ${color.panel}` },
                                e('h3', { 
                                    className: "text-sm tracking-widest font-semibold",
                                    style: { color: color.gold }
                                }, 'サマリー'),
                                e('div', { className: "mt-3 space-y-2 text-sm" },
                                    e('div', { className: "flex items-center justify-between opacity-80" },
                                        e('span', null, '伝票数'),
                                        e('span', null, tickets.length)
                                    ),
                                    e('div', { className: "flex items-center justify-between opacity-80" },
                                        e('span', null, '注文数'),
                                        e('span', null, activeTicket.orders.length)
                                    ),
                                    e('div', { className: "flex items-center justify-between opacity-80" },
                                        e('span', null, '現在合計'),
                                        e('span', null, jpy(total))
                                    ),
                                    e('div', { className: "flex items-center justify-between opacity-80" },
                                        e('span', null, '来店者'),
                                        e('span', null, activeTicket.customerName || (activeTicket.isNewGuest ? "新規様（後で記入）" : "—"))
                                    )
                                )
                            )
                        ),
                        
                        // DASHBOARD
                        activeTab === "dashboard" && e('div', { className: "grid grid-cols-1 lg:grid-cols-3 gap-6" },
                            e('div', { className: "rounded-xl p-6 border border-white/10 text-center" },
                                e('h3', { className: "font-semibold", style: { color: color.gold } }, '本日売上'),
                                e('p', { className: "mt-2 text-2xl font-bold" }, '¥123,000')
                            ),
                            e('div', { className: "rounded-xl p-6 border border-white/10 text-center" },
                                e('h3', { className: "font-semibold", style: { color: color.gold } }, '今月売上'),
                                e('p', { className: "mt-2 text-2xl font-bold" }, '¥2,340,000')
                            ),
                            e('div', { className: "rounded-xl p-6 border border-white/10 text-center" },
                                e('h3', { className: "font-semibold", style: { color: color.gold } }, '客数'),
                                e('p', { className: "mt-2 text-2xl font-bold" }, '54')
                            ),
                            e('div', { className: "lg:col-span-2 rounded-xl p-6 border border-white/10" },
                                e('div', { className: "text-sm opacity-80" }, 'キャスト別ランキング'),
                                e('ol', { className: "mt-2 list-decimal pl-5 space-y-1" },
                                    e('li', null, '美咲 - ¥45,000'),
                                    e('li', null, '葵 - ¥30,000'),
                                    e('li', null, 'なな - ¥18,500')
                                )
                            ),
                            e('div', { className: "rounded-xl p-6 border border-white/10" },
                                e('div', { className: "text-sm opacity-80" }, 'エクスポート'),
                                e('div', { className: "mt-3 flex gap-2" },
                                    e('button', { className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" }, 'PDF出力'),
                                    e('button', { className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" }, 'CSV出力')
                                )
                            )
                        ),
                        
                        // MENU
                        activeTab === "menu" && e('div', { className: `rounded-xl p-6 border ${color.line} ${color.panel}` },
                            e('h3', { className: "font-semibold mb-4", style: { color: color.gold } }, 'メニュー管理（JSON）'),
                            e('div', { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" },
                                e('textarea', {
                                    className: "w-full h-80 rounded-xl p-3 bg-black/40 border border-white/10 font-mono text-sm",
                                    value: menuJson,
                                    onChange: (evt) => setMenuJson(evt.target.value)
                                }),
                                e('div', { className: "space-y-3" },
                                    e('div', { className: "rounded-xl p-3 bg-black/20 border border-white/10" },
                                        e('div', { className: "text-xs opacity-70" }, '現在のメニュー'),
                                        e('ul', { className: "mt-2 text-sm space-y-1" },
                                            menus.map((m) => 
                                                e('li', { 
                                                    key: m.id,
                                                    className: "flex justify-between py-1 border-b border-white/5 last:border-0" 
                                                },
                                                    e('span', null, 
                                                        m.name, 
                                                        e('span', { className: "opacity-60" }, ` (${m.category})`)
                                                    ),
                                                    e('span', { style: { color: color.gold } }, jpy(m.price))
                                                )
                                            )
                                        )
                                    ),
                                    e('div', { className: "flex gap-2" },
                                        e('button', { 
                                            onClick: applyMenuJson,
                                            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" 
                                        }, 'JSON適用'),
                                        e('button', { 
                                            onClick: () => {
                                                setMenuJson(JSON.stringify(initialMenus, null, 2));
                                                setToast({ open: true, message: '初期メニューを読み込みました' });
                                            },
                                            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" 
                                        }, '初期化')
                                    ),
                                    e('div', { className: "text-xs opacity-70" }, 
                                        '※ MVPではUIフォーム化を予定。現在はJSON直編集で設定します。'
                                    )
                                )
                            )
                        ),
                        
                        // ATTENDANCE
                        activeTab === "attendance" && e('div', { className: `rounded-xl p-6 border ${color.line} ${color.panel}` },
                            e('h3', { className: "font-semibold mb-4", style: { color: color.gold } }, '勤怠（打刻）'),
                            e('div', { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" },
                                e('div', { className: "rounded-xl p-4 bg-black/20 border border-white/10" },
                                    e('div', { className: "text-sm opacity-80" }, '打刻'),
                                    e('div', { className: "mt-2 flex gap-2" },
                                        e('button', { 
                                            onClick: () => setToast({ open: true, message: '出勤を記録しました（モック）' }),
                                            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" 
                                        }, '出勤'),
                                        e('button', { 
                                            onClick: () => setToast({ open: true, message: '退勤を記録しました（モック）' }),
                                            className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" 
                                        }, '退勤')
                                    )
                                ),
                                e('div', { className: "rounded-xl p-4 bg-black/20 border border-white/10" },
                                    e('div', { className: "text-sm opacity-80" }, '本日の出勤者'),
                                    e('ul', { className: "mt-2 text-sm space-y-1" },
                                        e('li', null, '美咲 - 18:00 ~ 0:30'),
                                        e('li', null, '葵 - 19:00 ~ 2:00')
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            
            // Toast & Modal
            e(Toast, { 
                open: toast.open, 
                message: toast.message, 
                onClose: () => setToast({ open: false, message: "" }) 
            }),
            e(Modal, { 
                open: payOpen, 
                title: "会計（モック）", 
                onClose: () => setPayOpen(false) 
            },
                e('div', { className: "space-y-2 text-sm" },
                    e('div', { className: "flex items-center justify-between" },
                        e('span', null, '支払方法'),
                        e('span', { className: "font-medium" }, activeTicket.paymentType)
                    ),
                    e('div', { className: "flex items-center justify-between" },
                        e('span', null, '合計'),
                        e('span', { 
                            className: "text-lg font-bold",
                            style: { color: color.gold }
                        }, jpy(total))
                    )
                ),
                e('div', { className: "mt-4 flex justify-end gap-2" },
                    e('button', { 
                        onClick: () => setPayOpen(false),
                        className: "px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition" 
                    }, '閉じる'),
                    e('button', { 
                        onClick: () => {
                            if (needsConfirmOnPay(activeTicket.customerName)) {
                                const ok = window.confirm('来店者名が未入力です。会計を進めますか？');
                                if (!ok) return;
                            }
                            setPayOpen(false);
                            setToast({ open: true, message: '会計を完了しました（モック）' });
                        },
                        className: "px-4 py-2 rounded-xl font-semibold shadow-sm",
                        style: { 
                            background: "linear-gradient(180deg,#d7bd82,#C6A35E)", 
                            color: "#1b0f12" 
                        }
                    }, '確定')
                )
            )
        );
    }
    
    // Render
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(e(NightPosMock));
})();