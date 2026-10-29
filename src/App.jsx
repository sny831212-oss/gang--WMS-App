import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, QrCode, MapPin, LogIn, LogOut, Lock, CheckCircle, List, X, Truck, AlertTriangle, Menu, Search, Printer, ChevronRight, ChevronDown, Edit, Image as ImageIcon, ArrowLeft, Archive, Building, Trash2, Move, Upload, Home, Calendar, DollarSign, ExternalLink, CheckSquare, ArrowRightCircle, Plus, FileText, Grid, LayoutGrid, Maximize, Tag, Save, Copy, Layers, RotateCcw, Flashlight, Gamepad2, History } from 'lucide-react';

// === 正式線上初始資料 : 空間與物品全部歸零 ===
const INITIAL_INVENTORY_DATA = [];

// === 獨立彈件元件 ===
const ConfirmModal = ({ isOpen, title = "確認", message, onConfirm, onCancel, confirmText = "確定", confirmColor = "bg-red-600" }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full animate-pop border border-gray-700 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-yellow-500" size={24} />
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-all">取消</button>
          <button onClick={onConfirm} className={`flex-1 py-3 ${confirmColor} hover:opacity-90 text-white font-medium rounded-xl transition-all shadow-lg`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // === 核心狀態 ===
  const [inventory, setInventory] = useState(INITIAL_INVENTORY_DATA);
  const [trashBin, setTrashBin] = useState([]); // 近期註銷區
  const [actionLogs, setActionLogs] = useState([]); // 動作日誌流水
  const [currentTab, setCurrentTab] = useState('hud'); // 'hud' | 'inventory' | 'print'
  const [currentLocation, setCurrentLocation] = useState(null); // 目前鎖定倉庫
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false); // 右側日誌側欄
  const [isFlashlightOn, setIsFlashlightOn] = useState(false); // 手電筒開關

  // 彈窗狀態
  const [modalState, setModalState] = useState(null); // { type: 'createLoc' | 'addItem' | 'detail' | 'confirm', data: ... }
  
  // 檢視與選取模式
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('全部');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 記錄日誌輔助函數
  const logAction = (action, target, detail = '') => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action,
      target,
      detail
    };
    setActionLogs(prev => [newLog, ...prev.slice(0, 99)]); // 保留最近100筆
  };

  // 模擬開發控制台狀態
  const [simBarcode, setSimBarcode] = useState('ITEM-9988');
  const [simName, setSimName] = useState('現場新品');
  const [simCategory, setSimCategory] = useState('工具');
  const [simNote, setSimNote] = useState('廠牌規格備註...');
  const [simPhoto, setSimPhoto] = useState('https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300');

  // 動作 1: 建立新空間
  const handleCreateLocation = (locName) => {
    if (!locName.trim()) return;
    const newLoc = {
      id: 'loc_' + Date.now(),
      name: locName,
      children: []
    };
    setInventory(prev => [...prev, newLoc]);
    setCurrentLocation(newLoc);
    logAction('建立空間', locName);
    setModalState(null);
  };

  // 動作 2: 拍照後盲掃入庫 (結合照片與防呆)
  const handleBlindScanItem = () => {
    if (!currentLocation) {
      alert("請先在畫面點擊切換或建立目前所在的空間！");
      return;
    }
    const newItem = {
      id: simBarcode,
      name: simName || ('新物品_' + simBarcode.slice(-4)),
      category: simCategory,
      note: simNote,
      photo: simPhoto,
      scannedAt: new Date().toLocaleString()
    };

    setInventory(prev => prev.map(loc => {
      if (loc.id === currentLocation.id) {
        return { ...loc, children: [newItem, ...loc.children] };
      }
      return loc;
    }));

    logAction('盲掃入庫', newItem.name, `至 ${currentLocation.name}`);
    setModalState(null);
  };

  // 動作 3: 移動物品到目前鎖定空間
  const handleMoveToCurrent = (itemToMove, sourceLocId) => {
    if (!currentLocation) return;
    if (sourceLocId === currentLocation.id) {
      alert("此物品已經在此空間中！");
      return;
    }

    setInventory(prev => prev.map(loc => {
      if (loc.id === sourceLocId) {
        return { ...loc, children: loc.children.filter(i => i.id !== itemToMove.id) };
      }
      if (loc.id === currentLocation.id) {
        return { ...loc, children: [itemToMove, ...loc.children] };
      }
      return loc;
    }));

    logAction('現場掃描移倉', itemToMove.name, `移入 ${currentLocation.name}`);
  };

  // 動作 4: 移至近期註銷 (垃圾桶)
  const handleMoveToTrash = (item, locId) => {
    setInventory(prev => prev.map(loc => {
      if (loc.id === locId) {
        return { ...loc, children: loc.children.filter(i => i.id !== item.id) };
      }
      return loc;
    }));
    setTrashBin(prev => [{ ...item, originalLocId: locId }, ...prev]);
    logAction('註銷物品', item.name, '移至近期註銷區');
    setModalState(null);
  };

  // 動作 5: 從垃圾桶還原
  const handleRestoreFromTrash = (item) => {
    setTrashBin(prev => prev.filter(i => i.id !== item.id));
    setInventory(prev => prev.map(loc => {
      if (loc.id === item.originalLocId) {
        return { ...loc, children: [item, ...loc.children] };
      }
      return loc;
    }));
    logAction('還原物品', item.name, `回歸原空間`);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans select-none overflow-hidden">
      
      {/* ================= 左側：開發模擬控制台 (僅在寬螢幕顯示) ================= */}
      <div className="hidden lg:flex flex-col w-80 bg-gray-900 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
          <Gamepad2 className="text-cyan-400" size={22} />
          <h2 className="font-bold text-lg text-cyan-400">現場模擬控制台</h2>
        </div>

        <div className="bg-gray-800/50 p-3 rounded-2xl border border-gray-700/50 space-y-3">
          <p className="text-xs text-gray-400">模擬現場人員操作掃描器或盲掃進貨：</p>
          <div>
            <label className="text-xs text-gray-400 block mb-1">條碼編號 (ID)</label>
            <input type="text" value={simBarcode} onChange={e => setSimBarcode(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">物品名稱</label>
            <input type="text" value={simName} onChange={e => setSimName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">類別</label>
            <select value={simCategory} onChange={e => setSimCategory(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
              <option value="工具">工具</option>
              <option value="耗材">耗材</option>
              <option value="電子設備">電子設備</option>
              <option value="雜物">雜物</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">附註描述</label>
            <textarea value={simNote} onChange={e => setSimNote(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white h-16 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">模擬拍照</label>
            <div className="flex items-center gap-2">
              <img src={simPhoto} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-700" />
              <button onClick={() => setSimPhoto(`https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=300`)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs">切換隨機照片</button>
            </div>
          </div>

          <button 
            onClick={handleBlindScanItem}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 font-bold rounded-xl text-sm shadow-lg shadow-cyan-900/40 transition-all flex items-center justify-center gap-2"
          >
            <Camera size={16} /> 拍照後盲掃入庫
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-800 text-xs text-gray-500 space-y-1">
          <p>💡 提示：所有動作都會即時寫入右側流水日誌。</p>
          <p>🔒 目前狀態：完全零初始資料乾淨環境。</p>
        </div>
      </div>

      {/* ================= 右側：iPhone 真機比例外框 APP 本體 ================= */}
      <div className="flex-1 flex justify-center items-center bg-gray-950 p-0 sm:p-4">
        <div className="w-full max-w-[430px] h-full sm:h-[880px] bg-gray-900 sm:rounded-[48px] sm:border-[8px] sm:border-gray-800 shadow-2xl flex flex-col relative overflow-hidden">

          {/* APP 頂部導航列 */}
          <div className="bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-300">
                <Menu size={22} />
              </button>
              <div>
                <h1 className="font-bold text-white text-base leading-none">倉儲防呆 WMS</h1>
                <p className="text-[10px] text-cyan-400 mt-1">
                  {currentLocation ? `📍 鎖定: ${currentLocation.name}` : '⚠️ 尚未鎖定倉庫'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 手電筒快捷 */}
              <button 
                onClick={() => setIsFlashlightOn(!isFlashlightOn)}
                className={`p-2 rounded-xl transition-all ${isFlashlightOn ? 'bg-yellow-500 text-gray-950 shadow-lg shadow-yellow-500/50' : 'bg-gray-800 text-gray-400'}`}
              >
                <Flashlight size={18} />
              </button>
              {/* 日誌流水側欄按鈕 */}
              <button onClick={() => setIsLogDrawerOpen(true)} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl relative">
                <History size={18} />
                {actionLogs.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full"></span>}
              </button>
            </div>
          </div>

          {/* APP 內容主視圖 */}
          <div className="flex-1 overflow-y-auto relative pb-24">
            
            {/* TAB 1: 掃描指揮官 (HUD) */}
            {currentTab === 'hud' && (
              <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
                
                {/* 手電筒發光特效 */}
                {isFlashlightOn && (
                  <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none z-0 flex items-center justify-center">
                    <div className="w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
                  </div>
                )}

                {/* 相機預覽框 */}
                <div className="w-full aspect-[3/4] max-w-[320px] bg-black/60 rounded-3xl border-2 border-dashed border-gray-700 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl z-10">
                  <Camera size={56} className="text-gray-600 animate-pulse mb-3" />
                  <p className="text-sm font-medium text-gray-400">正在等待現場掃描...</p>
                  <p className="text-xs text-gray-600 mt-1">請將 QR Code 對準鏡頭框</p>

                  {/* 掃描雷射線 */}
                  <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-bounce"></div>
                </div>

                {/* 空間切換按鈕 (核心防呆) */}
                <div className="w-full max-w-[320px] bg-gray-800/80 backdrop-blur p-4 rounded-2xl border border-gray-700 text-left space-y-2 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">目前作業倉庫</span>
                    <button onClick={() => setModalState({ type: 'createLoc' })} className="text-xs text-cyan-400 hover:underline">＋ 建立新空間</button>
                  </div>
                  <button 
                    onClick={() => setModalState({ type: 'selectLoc' })}
                    className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-between text-white font-bold transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin size={18} className="text-cyan-400" />
                      {currentLocation ? currentLocation.name : '點此選擇目前所在空間 ➔'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                </div>

              </div>
            )}

            {/* TAB 2: 庫存總覽 (下鑽式分層架構) */}
            {currentTab === 'inventory' && (
              <div className="p-4 space-y-4">
                
                {/* 頂部搜尋與檢視切換 */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="全域搜尋物品、條碼、類別..." 
                      value={searchKeyword}
                      onChange={e => setSearchKeyword(e.target.value)}
                      className="w-full bg-gray-800/80 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-300">
                    {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
                  </button>
                </div>

                {/* 空間/垃圾桶 分頁標籤 */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-800">
                  <span className="text-xs font-bold text-gray-400 flex items-center">空間:</span>
                  {inventory.map(loc => (
                    <button 
                      key={loc.id}
                      onClick={() => { setCurrentLocation(loc); setSelectedCategoryFilter('全部'); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${currentLocation?.id === loc.id ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {loc.name} ({loc.children.length})
                    </button>
                  ))}
                  <button 
                    onClick={() => setCurrentLocation({ id: 'trash_view', name: '近期註銷區' })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${currentLocation?.id === 'trash_view' ? 'bg-red-600 text-white' : 'bg-gray-800 text-red-400 hover:bg-gray-700'}`}
                  >
                    <Trash2 size={12} /> 註銷區 ({trashBin.length})
                  </button>
                </div>

                {/* 內容呈現區 */}
                {currentLocation?.id === 'trash_view' ? (
                  // 近期註銷區
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">💡 這裡存放誤刪的物品，可隨時一鍵還原回原空間。</p>
                    {trashBin.length === 0 ? (
                      <div className="text-center py-12 text-gray-600 text-sm">近期註銷區是空的</div>
                    ) : (
                      trashBin.map(item => (
                        <div key={item.id} className="bg-gray-900 border border-red-900/50 p-3 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={item.photo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                            <div>
                              <h4 className="font-bold text-white text-sm">{item.name}</h4>
                              <p className="text-xs text-gray-500">ID: {item.id}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRestoreFromTrash(item)}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-400 rounded-xl text-xs flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> 還原
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : !currentLocation ? (
                  // 未選擇空間時顯示空間總覽卡片
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">請選擇下方倉庫以檢視內部物品：</p>
                    {inventory.length === 0 ? (
                      <div className="text-center py-16 text-gray-500 text-sm space-y-3">
                        <p>目前尚無任何空間資料</p>
                        <button onClick={() => setModalState({ type: 'createLoc' })} className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold">＋ 建立第一個倉庫</button>
                      </div>
                    ) : (
                      inventory.map(loc => (
                        <div 
                          key={loc.id} 
                          onClick={() => { setCurrentLocation(loc); setSelectedCategoryFilter('全部'); }}
                          className="bg-gray-900 border border-gray-800 hover:border-cyan-500/50 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                              <Building size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-base">{loc.name}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">總計存貨: {loc.children.length} 項</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-gray-500" />
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // 空間內部物品列表 (支援類別濾鏡與網格切換)
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-900 p-3 rounded-2xl border border-gray-800">
                      <div>
                        <h3 className="font-bold text-white text-sm">📂 {currentLocation.name}</h3>
                        <p className="text-[11px] text-gray-500">共 {currentLocation.children.length} 項物品</p>
                      </div>
                      <button onClick={() => setCurrentLocation(null)} className="text-xs text-cyan-400 hover:underline">返回空間列表</button>
                    </div>

                    {/* 類別篩選按鈕 (Pills) */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {['全部', '工具', '耗材', '電子設備', '雜物'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${selectedCategoryFilter === cat ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* 物品顯示 */}
                    {currentLocation.children.length === 0 ? (
                      <div className="text-center py-16 text-gray-600 text-sm">此空間目前沒有物品，請至相機頁面掃描入庫</div>
                    ) : (
                      <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-2"}>
                        {currentLocation.children
                          .filter(item => selectedCategoryFilter === '全部' || item.category === selectedCategoryFilter)
                          .map(item => (
                            <div 
                              key={item.id}
                              onClick={() => setModalState({ type: 'detail', data: { item, locId: currentLocation.id } })}
                              className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all ${viewMode === 'list' ? 'flex items-center p-3 gap-3' : 'flex flex-col'}`}
                            >
                              <img src={item.photo} alt="" className={viewMode === 'list' ? "w-14 h-14 rounded-xl object-cover" : "w-full aspect-square object-cover"} />
                              <div className="p-3 flex-1">
                                <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-cyan-400 rounded-md font-mono">{item.category}</span>
                                <h4 className="font-bold text-white text-sm mt-1 truncate">{item.name}</h4>
                                <p className="text-[11px] text-gray-500 truncate">{item.id}</p>
                              </div>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* TAB 3: 標籤列印中心 (支援複選) */}
            {currentTab === 'print' && (
              <div className="p-4 space-y-4">
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">🖨️ 條碼標籤列印中心</h3>
                    <p className="text-xs text-gray-400">勾選倉庫或物品以批次產生真實可掃描 QR Code</p>
                  </div>
                  <button onClick={() => window.print()} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                    <Printer size={14} /> 列印
                  </button>
                </div>

                {inventory.map(loc => (
                  <div key={loc.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <span className="font-bold text-white text-sm">{loc.name} ({loc.children.length})</span>
                      <span className="text-xs text-gray-500">真實 QR 碼預覽</span>
                    </div>
                    {loc.children.length === 0 ? (
                      <p className="text-xs text-gray-600 py-2">無物品可列印</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {loc.children.map(item => (
                          <div key={item.id} className="bg-gray-950 p-3 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                            {/* 真實 QR Code API 產出 */}
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(item.id)}`} 
                              alt="QR" 
                              className="w-20 h-20 bg-white p-1 rounded-lg mb-2"
                            />
                            <span className="text-xs font-bold text-white truncate w-full">{item.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{item.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* APP 底部導航欄 */}
          <div className="absolute bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 py-2 px-6 flex justify-around items-center z-20">
            <button 
              onClick={() => setCurrentTab('hud')}
              className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'hud' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Camera size={20} />
              <span className="text-[10px]">掃描 HUD</span>
            </button>
            <button 
              onClick={() => setCurrentTab('inventory')}
              className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'inventory' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Archive size={20} />
              <span className="text-[10px]">庫存總覽</span>
            </button>
            <button 
              onClick={() => setCurrentTab('print')}
              className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'print' ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Printer size={20} />
              <span className="text-[10px]">標籤列印</span>
            </button>
          </div>

          {/* ================= 彈窗與側欄區域 ================= */}

          {/* 右側動作日誌流水側欄 */}
          {isLogDrawerOpen && (
            <div className="absolute inset-0 z-50 bg-black/60 flex justify-end">
              <div className="w-80 h-full bg-gray-900 border-l border-gray-800 p-4 flex flex-col shadow-2xl animate-in slide-in-from-right">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="font-bold text-white flex items-center gap-2"><History size={16} /> 動作日誌流水</h3>
                  <button onClick={() => setIsLogDrawerOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                  {actionLogs.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-8">尚無任何操作紀錄</p>
                  ) : (
                    actionLogs.map(log => (
                      <div key={log.id} className="bg-gray-950 p-2.5 rounded-xl border border-gray-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-gray-500">
                          <span className="font-bold text-cyan-400">{log.action}</span>
                          <span>{log.time}</span>
                        </div>
                        <p className="text-white font-medium">{log.target}</p>
                        {log.detail && <p className="text-gray-400 text-[11px]">{log.detail}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 側邊導航選單 (Hamburger Menu) */}
          {isMenuOpen && (
            <div className="absolute inset-0 z-50 bg-black/70 flex">
              <div className="w-72 h-full bg-gray-900 border-r border-gray-800 p-5 flex flex-col shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="font-bold text-white text-lg">系統選單</h3>
                  <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="space-y-2">
                  <button onClick={() => { setCurrentTab('hud'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">📷 掃描指揮官</button>
                  <button onClick={() => { setCurrentTab('inventory'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">📦 庫存總覽與分類</button>
                  <button onClick={() => { setCurrentTab('print'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">🖨️ 條碼列印中心</button>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-800 text-xs text-gray-500">
                  <p>倉儲防呆 WMS V3.1</p>
                  <p className="mt-1">生產環境初始化版本</p>
                </div>
              </div>
              <div className="flex-1" onClick={() => setIsMenuOpen(false)}></div>
            </div>
          )}

          {/* 建立新空間彈窗 */}
          {modalState?.type === 'createLoc' && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-gray-700 space-y-4 shadow-2xl">
                <h3 className="text-lg font-bold text-white">建立新倉庫/空間</h3>
                <input 
                  type="text" 
                  id="newLocInput" 
                  placeholder="例如：B2 零件室、冷凍庫..." 
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModalState(null)} className="flex-1 py-2.5 bg-gray-800 rounded-xl text-gray-300 text-sm">取消</button>
                  <button 
                    onClick={() => {
                      const val = document.getElementById('newLocInput').value;
                      handleCreateLocation(val);
                    }}
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold"
                  >
                    確認建立
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 選擇目前空間彈窗 */}
          {modalState?.type === 'selectLoc' && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-gray-700 space-y-4 shadow-2xl">
                <h3 className="text-lg font-bold text-white">選擇目前作業空間</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {inventory.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">尚無空間，請先建立</p>
                  ) : (
                    inventory.map(loc => (
                      <button 
                        key={loc.id}
                        onClick={() => { setCurrentLocation(loc); setModalState(null); }}
                        className="w-full text-left p-3 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 flex items-center justify-between text-white text-sm"
                      >
                        <span>{loc.name}</span>
                        <span className="text-xs text-gray-500">{loc.children.length} 件物品</span>
                      </button>
                    ))
                  )}
                </div>
                <button onClick={() => setModalState({ type: 'createLoc' })} className="w-full py-2 bg-gray-800 text-cyan-400 rounded-xl text-xs font-bold">＋ 建立新空間</button>
                <button onClick={() => setModalState(null)} className="w-full py-2 bg-gray-950 text-gray-400 rounded-xl text-xs">關閉</button>
              </div>
            </div>
          )}

          {/* 物品詳情彈窗 (含真實 QR 碼與附註描述) */}
          {modalState?.type === 'detail' && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-gray-700 space-y-4 shadow-2xl overflow-y-auto max-h-[85vh]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">物品詳細資料</h3>
                  <button onClick={() => setModalState(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                </div>
                
                <img src={modalState.data.item.photo} alt="" className="w-full aspect-video object-cover rounded-2xl border border-gray-800" />
                
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-mono">ID: {modalState.data.item.id}</span>
                    <h4 className="font-bold text-white text-lg">{modalState.data.item.name}</h4>
                  </div>
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 space-y-1 text-xs">
                    <p className="text-gray-400"><strong className="text-gray-200">類別：</strong>{modalState.data.item.category}</p>
                    <p className="text-gray-400"><strong className="text-gray-200">入庫時間：</strong>{modalState.data.item.scannedAt}</p>
                    <p className="text-gray-400"><strong className="text-gray-200">附註描述：</strong>{modalState.data.item.note || '無'}</p>
                  </div>

                  {/* 真實 QR Code */}
                  <div className="bg-white p-4 rounded-xl flex flex-col items-center">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(modalState.data.item.id)}`} alt="QR" className="w-28 h-28" />
                    <span className="text-[10px] text-gray-600 font-mono mt-1">{modalState.data.item.id}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => handleMoveToTrash(modalState.data.item, modalState.data.locId)}
                    className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-900/50 rounded-xl text-xs font-bold"
                  >
                    註銷物品
                  </button>
                  <button onClick={() => setModalState(null)} className="flex-1 py-2.5 bg-gray-800 text-white rounded-xl text-xs">關閉</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}