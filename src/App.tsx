import { useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useDebounceValue } from 'usehooks-ts';
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
    // const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
    const [debouncedCurrent] = useDebounceValue(current, 15000);
    const hasMounted = useRef(false);

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
            id: prev.id || nanoid(),
            [field]: Number(value) || 0
        }));
    };

    const handleNameChange = (value: string) => {
        setCurrent((prev) => ({
            ...prev,
            id: prev.id || nanoid(),
            name: value || 'Untitled'
        }));
    };

    const handleProfitChange = (value: string) => {
        const parsed = Number(value) as ProfitPercent;
        setCurrent((prev) => ({
            ...prev,
            id: prev.id || nanoid(),
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

    const handleNew = () => setCurrent(createEmptyItem());

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }

        const isEmpty =
            !debouncedCurrent.id &&
            debouncedCurrent.name.trim().toLowerCase() === 'untitled' &&
            debouncedCurrent.quantity === 0 &&
            debouncedCurrent.pricePerItem === 0 &&
            debouncedCurrent.setupFee === 0 &&
            debouncedCurrent.shipping === 0;

        if (isEmpty) return;

        const timer = setTimeout(() => {
            upsertItem(debouncedCurrent);
        }, 0);

        return () => clearTimeout(timer);
    }, [debouncedCurrent]);

    return (
        <div className="app-shell">
            <header className="app-header">
                <h1>Pricing calculator</h1>
            </header>
            <div className="panel list-panel">
                <div className="panel-header">
                    <div className="label">
                        Saved items ({savedItems.length})
                    </div>
                    <div className="actions header-actions">
                        <button className="btn btn-success" onClick={handleNew}>
                            New item
                        </button>
                    </div>
                </div>
                {savedItems.length === 0 ? (
                    <div className="label">Nothing saved yet.</div>
                ) : (
                    <div className="saved-list">
                        {savedItems.map((item) => (
                            <details
                                key={item.id}
                                className={`saved-row${
                                    current.id === item.id ? ' is-active' : ''
                                }`}
                                open={current.id === item.id}
                            >
                                <summary className="saved-summary">
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
                                    <span className="summary-hint">
                                        Details
                                    </span>
                                </summary>
                                <div className="saved-details">
                                    <div className="saved-meta">
                                        <span>Qty: {item.quantity}</span>
                                        <span>
                                            Price:{' '}
                                            {formatCurrency(item.pricePerItem)}
                                        </span>
                                        <span>
                                            Setup:{' '}
                                            {formatCurrency(item.setupFee)}
                                        </span>
                                        <span>
                                            Shipping:{' '}
                                            {formatCurrency(item.shipping)}
                                        </span>
                                        <span>
                                            Profit:{' '}
                                            {Math.round(
                                                item.profitPercent * 100
                                            )}
                                            %
                                        </span>
                                        <span>
                                            Subtotal:{' '}
                                            {formatCurrency(
                                                calculateTotals(item).subtotal
                                            )}
                                        </span>
                                    </div>
                                    <div className="actions saved-actions">
                                        {current.id !== item.id && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() =>
                                                    handleLoad(item.id)
                                                }
                                            >
                                                Edit
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-danger"
                                            onClick={() =>
                                                handleDelete(item.id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>

            <div className="panel form-panel">
                <div className="form-columns">
                    <div className="form-left">
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
                            </div>
                            <div className="field">
                                <label htmlFor="price">Price per item</label>
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
                            </div>
                        </div>
                    </div>
                    <div className="form-right">
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
            </div>
        </div>
    );
}

export default App;
