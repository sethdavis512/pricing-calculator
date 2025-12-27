import { useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import './App.css';

type ProfitPercent = 0.2 | 0.25 | 0.3;

type Item = {
    id: string;
    name: string;
    quantity: number;
    pricePerItem: number;
    setupFee: number;
    shipping: number;
    profitPercent: ProfitPercent;
};

type NumericField = 'quantity' | 'pricePerItem' | 'setupFee' | 'shipping';

const PROFIT_OPTIONS: ProfitPercent[] = [0.2, 0.25, 0.3];
const STORAGE_KEY = 'pricing-calculator-items';

const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
});

const formatCurrency = (value: number) =>
    currency.format(Number.isFinite(value) ? value : 0);

const createEmptyItem = (): Item => ({
    id: '',
    name: 'Untitled',
    quantity: 0,
    pricePerItem: 0,
    setupFee: 0,
    shipping: 0,
    profitPercent: 0.2
});

const calculateTotals = (item: Item) => {
    const qty = Math.max(0, item.quantity);
    const perItem = Math.max(0, item.pricePerItem);
    const setup = Math.max(0, item.setupFee);
    const shipping = Math.max(0, item.shipping);
    const subtotal = qty * perItem + setup + shipping;
    const profitValue = subtotal * item.profitPercent;
    const total = subtotal + profitValue;
    return { subtotal, profitValue, total };
};

const isBlankNewItem = (item: Item) =>
    !item.id &&
    item.name.trim().toLowerCase() === 'untitled' &&
    item.quantity === 0 &&
    item.pricePerItem === 0 &&
    item.setupFee === 0 &&
    item.shipping === 0;

const loadSavedItems = (): Item[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((item) => ({
            ...createEmptyItem(),
            ...item,
            profitPercent: PROFIT_OPTIONS.includes(item.profitPercent)
                ? item.profitPercent
                : 0.2
        }));
    } catch (error) {
        console.error('Unable to load saved items', error);
        return [];
    }
};

function App() {
    const [current, setCurrent] = useState<Item>(() => createEmptyItem());
    const [savedItems, setSavedItems] = useState<Item[]>(() =>
        loadSavedItems()
    );
    const savedItemsRef = useRef<Item[]>(savedItems);
    const newDialogRef = useRef<HTMLDialogElement | null>(null);
    const [newItemDraft, setNewItemDraft] = useState<Item>(() =>
        createEmptyItem()
    );

    const persistItems = (items: Item[]) => {
        setSavedItems(items);
        savedItemsRef.current = items;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    const upsertItem = (item: Item) => {
        const id = item.id || nanoid();
        const nextItem: Item = { ...item, id };
        const exists = savedItemsRef.current.some((saved) => saved.id === id);
        const updated = exists
            ? savedItemsRef.current.map((saved) =>
                  saved.id === id ? nextItem : saved
              )
            : [...savedItemsRef.current, nextItem];
        persistItems(updated);
        return nextItem;
    };

    const handleNumberChange = (field: NumericField) => (value: string) => {
        setCurrent((prev) => ({
            ...prev,
            [field]: Number(value) || 0
        }));
    };

    const handleNameChange = (value: string) => {
        setCurrent((prev) => ({
            ...prev,
            name: value || 'Untitled'
        }));
    };

    const handleProfitChange = (value: string) => {
        const parsed = Number(value) as ProfitPercent;
        setCurrent((prev) => ({
            ...prev,
            profitPercent: PROFIT_OPTIONS.includes(parsed) ? parsed : 0.2
        }));
    };

    const handleNewNumberChange = (field: NumericField) => (value: string) => {
        setNewItemDraft((prev) => ({
            ...prev,
            [field]: Number(value) || 0
        }));
    };

    const handleNewNameChange = (value: string) => {
        setNewItemDraft((prev) => ({
            ...prev,
            name: value || 'Untitled'
        }));
    };

    const handleNewProfitChange = (value: string) => {
        const parsed = Number(value) as ProfitPercent;
        setNewItemDraft((prev) => ({
            ...prev,
            profitPercent: PROFIT_OPTIONS.includes(parsed) ? parsed : 0.2
        }));
    };

    const { subtotal, profitValue, total } = useMemo(
        () => calculateTotals(current),
        [current]
    );

    const handleLoad = (id: string) => {
        const item = savedItems.find((saved) => saved.id === id);
        if (item) setCurrent(item);
    };

    const handleDelete = (id: string) => {
        const filtered = savedItems.filter((item) => item.id !== id);
        persistItems(filtered);
        if (current.id === id) {
            setCurrent(createEmptyItem());
        }
    };

    const openCreateDialog = () => {
        setNewItemDraft(createEmptyItem());
        newDialogRef.current?.showModal();
    };

    const closeCreateDialog = () => {
        newDialogRef.current?.close();
    };

    const handleCreateDialogClose = () => {
        setNewItemDraft(createEmptyItem());
    };

    const canSave = useMemo(() => Boolean(current.id), [current.id]);
    const canCreate = useMemo(
        () => !isBlankNewItem(newItemDraft),
        [newItemDraft]
    );

    const hasSelection = Boolean(current.id);
    const hasSavedItems = savedItems.length > 0;

    const handleSave = () => {
        if (!canSave) return;
        const saved = upsertItem(current);
        setCurrent(saved);
    };

    const handleAddNew = () => {
        if (!canCreate) return;
        const saved = upsertItem(newItemDraft);
        setCurrent(saved);
        closeCreateDialog();
    };

    return (
        <div className="app-shell">
            <dialog
                ref={newDialogRef}
                className="create-dialog"
                onClose={handleCreateDialogClose}
            >
                <form
                    className="dialog-card"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAddNew();
                    }}
                >
                    <div className="dialog-header">
                        <div>
                            <div className="dialog-title">
                                Create a new item
                            </div>
                            <p className="dialog-subtitle">
                                Start a fresh quote without losing what you are
                                currently editing.
                            </p>
                        </div>
                    </div>
                    <div className="grid dialog-grid">
                        <div className="field">
                            <label htmlFor="new-name">Item name</label>
                            <input
                                id="new-name"
                                value={newItemDraft.name}
                                onChange={(e) =>
                                    handleNewNameChange(e.target.value)
                                }
                                placeholder="Untitled"
                            />
                            <div className="field-hint">
                                Give it a short name so you can find it later.
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="new-quantity">Quantity</label>
                            <input
                                id="new-quantity"
                                type="number"
                                min={0}
                                step={1}
                                value={newItemDraft.quantity}
                                onChange={(e) =>
                                    handleNewNumberChange('quantity')(
                                        e.target.value
                                    )
                                }
                            />
                            <div className="field-hint">
                                How many units are in this quote.
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="new-price">Price per item</label>
                            <input
                                id="new-price"
                                type="number"
                                min={0}
                                step={0.01}
                                value={newItemDraft.pricePerItem}
                                onChange={(e) =>
                                    handleNewNumberChange('pricePerItem')(
                                        e.target.value
                                    )
                                }
                            />
                            <div className="field-hint">
                                Cost for one unit before profit.
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="new-setup">Setup fee</label>
                            <input
                                id="new-setup"
                                type="number"
                                min={0}
                                step={0.01}
                                value={newItemDraft.setupFee}
                                onChange={(e) =>
                                    handleNewNumberChange('setupFee')(
                                        e.target.value
                                    )
                                }
                            />
                            <div className="field-hint">
                                One-time fee for this order (optional).
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="new-shipping">Shipping</label>
                            <input
                                id="new-shipping"
                                type="number"
                                min={0}
                                step={0.01}
                                value={newItemDraft.shipping}
                                onChange={(e) =>
                                    handleNewNumberChange('shipping')(
                                        e.target.value
                                    )
                                }
                            />
                            <div className="field-hint">
                                Shipping cost for this order (optional).
                            </div>
                        </div>
                        <div className="field">
                            <label htmlFor="new-profit">Gross profit</label>
                            <select
                                id="new-profit"
                                value={newItemDraft.profitPercent}
                                onChange={(e) =>
                                    handleNewProfitChange(e.target.value)
                                }
                            >
                                {PROFIT_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {Math.round(option * 100)}%
                                    </option>
                                ))}
                            </select>
                            <div className="field-hint">
                                Applied to subtotal to reach your target profit.
                            </div>
                        </div>
                    </div>
                    <div className="actions dialog-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={closeCreateDialog}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!canCreate}
                        >
                            Add item
                        </button>
                    </div>
                </form>
            </dialog>
            <header className="app-header">
                <h1>Pricing calculator</h1>
                <p className="app-intro">
                    Enter your costs, pick a profit target, and save quotes to
                    reuse later. Everything stays on this device.
                </p>
            </header>
            <div className="panel list-panel">
                <div className="panel-header">
                    <div className="label">
                        Saved items ({savedItems.length})
                    </div>
                    <div className="actions header-actions">
                        <button
                            className="btn btn-success"
                            onClick={openCreateDialog}
                        >
                            New item
                        </button>
                    </div>
                </div>
                <div className="list-hint">
                    Click a saved item to load it into the form. Delete removes
                    it from this list.
                </div>
                {savedItems.length === 0 ? (
                    <div className="label">
                        Nothing saved yet. Fill the form on the right and click
                        Save item.
                    </div>
                ) : (
                    <div className="saved-list">
                        {savedItems.map((item) => (
                            <div
                                key={item.id}
                                className={`saved-row${
                                    current.id === item.id ? ' is-active' : ''
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleLoad(item.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleLoad(item.id);
                                    }
                                }}
                            >
                                <div className="saved-main">
                                    <div className="saved-name-display">
                                        {item.name || 'Untitled'}
                                    </div>
                                    <span className="pill">
                                        {formatCurrency(
                                            calculateTotals(item).total
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="panel form-panel">
                {hasSelection ? (
                    <div className="form-columns">
                        <div className="form-left">
                            <p className="form-hint">
                                Tip: leave setup or shipping at 0 if they do not
                                apply.
                            </p>
                            <div className="grid input-stack">
                                <div className="field">
                                    <label htmlFor="name">Item name</label>
                                    <input
                                        id="name"
                                        value={current.name}
                                        onChange={(e) =>
                                            handleNameChange(e.target.value)
                                        }
                                        placeholder="Untitled"
                                    />
                                    <div className="field-hint">
                                        Give it a short name so you can find it
                                        later.
                                    </div>
                                </div>
                                <div className="field">
                                    <label htmlFor="quantity">Quantity</label>
                                    <input
                                        id="quantity"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={current.quantity}
                                        onChange={(e) =>
                                            handleNumberChange('quantity')(
                                                e.target.value
                                            )
                                        }
                                    />
                                    <div className="field-hint">
                                        How many units are in this quote.
                                    </div>
                                </div>
                                <div className="field">
                                    <label htmlFor="price">
                                        Price per item
                                    </label>
                                    <input
                                        id="price"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={current.pricePerItem}
                                        onChange={(e) =>
                                            handleNumberChange('pricePerItem')(
                                                e.target.value
                                            )
                                        }
                                    />
                                    <div className="field-hint">
                                        Cost for one unit before profit.
                                    </div>
                                </div>
                                <div className="field">
                                    <label htmlFor="setup">Setup fee</label>
                                    <input
                                        id="setup"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={current.setupFee}
                                        onChange={(e) =>
                                            handleNumberChange('setupFee')(
                                                e.target.value
                                            )
                                        }
                                    />
                                    <div className="field-hint">
                                        One-time fee for this order (optional).
                                    </div>
                                </div>
                                <div className="field">
                                    <label htmlFor="shipping">Shipping</label>
                                    <input
                                        id="shipping"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={current.shipping}
                                        onChange={(e) =>
                                            handleNumberChange('shipping')(
                                                e.target.value
                                            )
                                        }
                                    />
                                    <div className="field-hint">
                                        Shipping cost for this order (optional).
                                    </div>
                                </div>
                                <div className="field">
                                    <label htmlFor="profit">Gross profit</label>
                                    <select
                                        id="profit"
                                        value={current.profitPercent}
                                        onChange={(e) =>
                                            handleProfitChange(e.target.value)
                                        }
                                    >
                                        {PROFIT_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {Math.round(option * 100)}%
                                            </option>
                                        ))}
                                    </select>
                                    <div className="field-hint">
                                        Applied to subtotal to reach your target
                                        profit.
                                    </div>
                                </div>
                                <div className="actions totals-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSave}
                                        disabled={!canSave}
                                    >
                                        Save item
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(current.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="form-right">
                            <div className="note-card">
                                <div className="note-title">How to use</div>
                                <ul className="note-list">
                                    <li>
                                        Enter quantity, price, setup, and
                                        shipping costs on the left.
                                    </li>
                                    <li>
                                        Select your target gross profit
                                        percentage.
                                    </li>
                                    <li>
                                        Totals update instantly; click “Save
                                        item” to store it locally.
                                    </li>
                                    <li>
                                        Use the list on the left to reopen,
                                        edit, or delete saved items.
                                    </li>
                                    <li>
                                        Saves are stored locally in your
                                        browser.
                                    </li>
                                </ul>
                            </div>
                            <div className="totals">
                                <div className="total-box">
                                    <div className="label">Subtotal</div>
                                    <div className="value">
                                        {formatCurrency(subtotal)}
                                    </div>
                                </div>
                                <div className="total-box">
                                    <div className="label">Gross profit</div>
                                    <div className="value">
                                        {formatCurrency(profitValue)}
                                    </div>
                                </div>
                                <div className="total-box">
                                    <div className="label">Total</div>
                                    <div className="value">
                                        {formatCurrency(total)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-header">
                            <div className="empty-eyebrow">
                                No item selected
                            </div>
                            <h2 className="empty-title">
                                Pick something on the left to start editing
                            </h2>
                            <p className="empty-text">
                                {hasSavedItems
                                    ? 'Choose a saved quote to view its details and totals.'
                                    : 'Create your first quote to start calculating totals.'}
                            </p>
                        </div>
                        <div className="actions">
                            <button
                                className="btn btn-success"
                                onClick={openCreateDialog}
                            >
                                New item
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    if (hasSavedItems && savedItems[0]) {
                                        handleLoad(savedItems[0].id);
                                    }
                                }}
                                disabled={!hasSavedItems}
                            >
                                Load first saved item
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
