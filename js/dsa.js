/**
 * dsa.js - Core Data Structures Implementation for Pump Shift
 * 
 * 1. QUEUE (FIFO)        -> Customer Vehicle Line
 * 2. STACK (LIFO)        -> Transaction Stack & Reversible Undo
 * 3. HASH MAP (Key-Value)-> Fuel Pricing/Stock & Car Order Lookups (O(1))
 * 4. ARRAY / LIST        -> Daily Sales Analytical Ledger
 */

// ==========================================
// 1. QUEUE: FIFO (First-In, First-Out)
// ==========================================
class CustomerQueue {
  constructor() {
    this.items = [];
    this.onChange = null;
  }

  // Add car to the back of the queue
  enqueue(car) {
    this.items.push(car);
    if (this.onChange) this.onChange(this.getSnapshot());
    return this.size();
  }

  // Remove car from front of queue when service finishes
  dequeue() {
    if (this.isEmpty()) return null;
    const servedCar = this.items.shift();
    if (this.onChange) this.onChange(this.getSnapshot());
    return servedCar;
  }

  // Remove car if impatient customer leaves
  removeCar(carId) {
    const idx = this.items.findIndex(c => c.id === carId);
    if (idx !== -1) {
      const removed = this.items.splice(idx, 1)[0];
      if (this.onChange) this.onChange(this.getSnapshot());
      return removed;
    }
    return null;
  }

  // View car currently at pump without removing
  peek() {
    return this.items.length > 0 ? this.items[0] : null;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  // Return queue position (1-indexed)
  getPosition(carId) {
    const idx = this.items.findIndex(c => c.id === carId);
    return idx === -1 ? -1 : idx + 1;
  }

  // Array copy for UI and inspection
  toArray() {
    return [...this.items];
  }

  getSnapshot() {
    return {
      size: this.items.length,
      items: this.items.map((car, idx) => ({
        queuePos: idx + 1,
        id: car.id,
        fuelType: car.fuelType,
        targetLitres: car.targetLitres,
        patience: car.patience,
        modelType: car.modelType,
        colorHex: car.colorHex
      }))
    };
  }
}

// ==========================================
// 2. STACK: LIFO (Last-In, First-Out)
// ==========================================
class TransactionStack {
  constructor() {
    this.items = [];
    this.onChange = null;
  }

  // Push new sale record onto top of stack
  push(transaction) {
    this.items.push({
      ...transaction,
      stackIndex: this.items.length,
      canUndo: true
    });
    if (this.onChange) this.onChange(this.getSnapshot());
  }

  // Pop and return top transaction for Undo
  pop() {
    if (this.isEmpty()) return null;
    const lastSale = this.items.pop();
    if (this.onChange) this.onChange(this.getSnapshot());
    return lastSale;
  }

  // Peek at top of stack (most recent transaction)
  peek() {
    return this.items.length > 0 ? this.items[this.items.length - 1] : null;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  // Invalidate older undos once a newer sale starts
  markUndoConsumed() {
    if (this.items.length > 0) {
      this.items[this.items.length - 1].canUndo = false;
      if (this.onChange) this.onChange(this.getSnapshot());
    }
  }

  // Array representation with top-of-stack first for UI presentation
  toArray() {
    return [...this.items].reverse();
  }

  getSnapshot() {
    return {
      size: this.items.length,
      top: this.peek(),
      items: [...this.items].reverse()
    };
  }
}

// ==========================================
// 3. HASH MAP: O(1) Key-Value Store
// ==========================================
class FuelHashMap {
  constructor() {
    // Key: fuelType (string) -> Value: { name, price, stock, maxStock, unit, color, badgeColor }
    this.map = new Map();
    this.initDefaults();
    this.onChange = null;
  }

  initDefaults() {
    this.map.set('regular', {
      id: 'regular',
      name: 'Regular Petrol',
      octane: 87,
      price: 102.50,
      stock: 350.0,
      maxStock: 400.0,
      color: '#38bdf8', // Sky blue
      badgeClass: 'badge-regular',
      description: 'Standard unleaded petrol for sedans and compacts'
    });

    this.map.set('premium', {
      id: 'premium',
      name: 'Premium Speed',
      octane: 93,
      price: 112.00,
      stock: 280.0,
      maxStock: 300.0,
      color: '#c084fc', // Purple
      badgeClass: 'badge-premium',
      description: 'High octane performance petrol for sports cars'
    });

    this.map.set('diesel', {
      id: 'diesel',
      name: 'Diesel Bio',
      octane: 45, // Cetane
      price: 94.00,
      stock: 320.0,
      maxStock: 350.0,
      color: '#4ade80', // Emerald green
      badgeClass: 'badge-diesel',
      description: 'High-torque compression diesel for SUVs and trucks'
    });
  }

  get(fuelType) {
    return this.map.get(fuelType.toLowerCase()) || null;
  }

  has(fuelType) {
    return this.map.has(fuelType.toLowerCase());
  }

  // Consume fuel from stock
  dispense(fuelType, litres) {
    const fuel = this.get(fuelType);
    if (!fuel) return { success: false, reason: 'Invalid fuel type' };
    if (fuel.stock < litres) {
      const delivered = fuel.stock;
      fuel.stock = 0;
      if (this.onChange) this.onChange(this.getAll());
      return { success: false, reason: 'Out of stock', delivered };
    }
    fuel.stock -= litres;
    if (this.onChange) this.onChange(this.getAll());
    return { success: true, delivered: litres };
  }

  // Restock (e.g., when an undo restores fuel or delivery truck arrives)
  restock(fuelType, litres) {
    const fuel = this.get(fuelType);
    if (!fuel) return;
    fuel.stock = Math.min(fuel.maxStock, fuel.stock + litres);
    if (this.onChange) this.onChange(this.getAll());
  }

  getAll() {
    const obj = {};
    for (const [key, val] of this.map.entries()) {
      obj[key] = { ...val };
    }
    return obj;
  }

  keys() {
    return Array.from(this.map.keys());
  }
}

// Car Order Hash Map: Car ID -> Order Details
class CarOrderMap {
  constructor() {
    this.map = new Map();
  }

  setOrder(carId, orderDetails) {
    this.map.set(carId, {
      ...orderDetails,
      registeredAt: Date.now()
    });
  }

  getOrder(carId) {
    return this.map.get(carId) || null;
  }

  removeOrder(carId) {
    return this.map.delete(carId);
  }

  hasOrder(carId) {
    return this.map.has(carId);
  }

  size() {
    return this.map.size;
  }
}

// ==========================================
// 4. ARRAY / LIST: Daily Sales Ledger
// ==========================================
class DailySalesList {
  constructor() {
    this.entries = []; // Array of transaction objects
    this.onChange = null;
  }

  // Append completed transaction (O(1) amortized)
  append(sale) {
    this.entries.push({
      ...sale,
      entryIndex: this.entries.length,
      isReversed: false
    });
    if (this.onChange) this.onChange(this.generateReport());
  }

  // Remove or reverse matching entry when an Undo is performed
  removeById(transactionId) {
    const idx = this.entries.findIndex(entry => entry.id === transactionId && !entry.isReversed);
    if (idx !== -1) {
      // Mark as reversed for audit trail while removing from active totals
      const removed = this.entries[idx];
      removed.isReversed = true;
      if (this.onChange) this.onChange(this.generateReport());
      return removed;
    }
    return null;
  }

  // Active (non-reversed) sales
  getActiveSales() {
    return this.entries.filter(s => !s.isReversed);
  }

  // Aggregate daily statistics
  generateReport() {
    const active = this.getActiveSales();
    let totalRevenue = 0;
    let totalLitres = 0;
    const fuelBreakdown = {
      regular: { litres: 0, revenue: 0, count: 0 },
      premium: { litres: 0, revenue: 0, count: 0 },
      diesel: { litres: 0, revenue: 0, count: 0 }
    };

    active.forEach(sale => {
      totalRevenue += sale.total;
      totalLitres += sale.litres;
      if (fuelBreakdown[sale.fuelType]) {
        fuelBreakdown[sale.fuelType].litres += sale.litres;
        fuelBreakdown[sale.fuelType].revenue += sale.total;
        fuelBreakdown[sale.fuelType].count += 1;
      }
    });

    const customerCount = active.length;
    const averageTicket = customerCount > 0 ? (totalRevenue / customerCount) : 0;

    return {
      totalTransactions: this.entries.length,
      activeTransactions: customerCount,
      reversedTransactions: this.entries.length - customerCount,
      totalRevenue: totalRevenue,
      totalLitres: totalLitres,
      averageTicket: averageTicket,
      fuelBreakdown: fuelBreakdown,
      salesList: [...this.entries]
    };
  }
}

// ==========================================
// 5. LINKED LIST: Singly Linked List (Sequential Receipt Chain)
// ==========================================
class ReceiptNode {
  constructor(transaction) {
    this.id = transaction.id;
    this.carId = transaction.carId;
    this.fuelType = transaction.fuelType;
    this.fuelName = transaction.fuelName;
    this.litres = transaction.litres;
    this.pricePerLitre = transaction.pricePerLitre;
    this.total = transaction.total;
    this.timestamp = transaction.timestamp || new Date().toLocaleTimeString();
    this.next = null; // Pointer to next node in sequence
  }
}

class ReceiptLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.count = 0;
    this.onChange = null;
  }

  // O(1) Append receipt to tail of linked list
  append(transaction) {
    const newNode = new ReceiptNode(transaction);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.count++;
    if (this.onChange) this.onChange(this.getSnapshot());
    return newNode;
  }

  // O(N) Remove by transaction ID (for undo/reversal synchronization)
  removeById(txId) {
    if (!this.head) return null;

    // Head removal
    if (this.head.id === txId) {
      const removed = this.head;
      this.head = this.head.next;
      if (!this.head) this.tail = null;
      this.count--;
      if (this.onChange) this.onChange(this.getSnapshot());
      return removed;
    }

    let prev = this.head;
    let curr = this.head.next;
    while (curr) {
      if (curr.id === txId) {
        prev.next = curr.next;
        if (curr === this.tail) {
          this.tail = prev;
        }
        this.count--;
        if (this.onChange) this.onChange(this.getSnapshot());
        return curr;
      }
      prev = curr;
      curr = curr.next;
    }
    return null;
  }

  // O(N) Sequential Traversal to calculate total revenue, volume, and generate step trace
  calculateTotal() {
    let runningTotal = 0;
    let runningLitres = 0;
    const steps = [];
    let current = this.head;
    let stepIndex = 1;

    while (current) {
      runningTotal += current.total;
      runningLitres += current.litres;
      steps.push({
        step: stepIndex,
        nodeId: current.id,
        carId: current.carId,
        fuelName: current.fuelName,
        litres: current.litres,
        amount: current.total,
        accumulatedTotal: parseFloat(runningTotal.toFixed(2))
      });
      current = current.next;
      stepIndex++;
    }

    return {
      totalAmount: parseFloat(runningTotal.toFixed(2)),
      totalLitres: parseFloat(runningLitres.toFixed(1)),
      count: this.count,
      steps: steps,
      averagePerCar: this.count > 0 ? parseFloat((runningTotal / this.count).toFixed(2)) : 0.00
    };
  }

  toArray() {
    const arr = [];
    let curr = this.head;
    let idx = 0;
    while (curr) {
      arr.push({
        index: idx,
        id: curr.id,
        carId: curr.carId,
        fuelName: curr.fuelName,
        litres: curr.litres,
        total: curr.total,
        hasNext: curr.next !== null,
        nextId: curr.next ? curr.next.id : null
      });
      curr = curr.next;
      idx++;
    }
    return arr;
  }

  clear() {
    this.head = null;
    this.tail = null;
    this.count = 0;
    if (this.onChange) this.onChange(this.getSnapshot());
  }

  getSnapshot() {
    return {
      size: this.count,
      head: this.head ? { id: this.head.id, carId: this.head.carId, total: this.head.total } : null,
      tail: this.tail ? { id: this.tail.id, carId: this.tail.carId, total: this.tail.total } : null,
      nodes: this.toArray()
    };
  }
}

// Make accessible to game logic and tests
window.CustomerQueue = CustomerQueue;
window.TransactionStack = TransactionStack;
window.FuelHashMap = FuelHashMap;
window.CarOrderMap = CarOrderMap;
window.DailySalesList = DailySalesList;
window.ReceiptNode = ReceiptNode;
window.ReceiptLinkedList = ReceiptLinkedList;

