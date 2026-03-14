import React, { useEffect, useState } from 'react';
import ManagerSidebar from '../components/ManagerSidebar';

function InventoryManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    quantity_available: '',
    unit: '',
    minimum_threshold: '',
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/inventory-items');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category: '',
      quantity_available: '',
      unit: '',
      minimum_threshold: '',
    });
    setFormError('');
  };

  const handleCreateItem = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        item_name: formData.item_name,
        category: formData.category,
        quantity_available: Number(formData.quantity_available || 0),
        unit: formData.unit,
        minimum_threshold: Number(formData.minimum_threshold || 0),
      };

      const response = await fetch('http://localhost:5000/api/inventory-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || 'Failed to create inventory item');
      }

      await fetchItems();
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      setFormError(error.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f6f8] dark:bg-[#191022]">
      <ManagerSidebar active="inventory" />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Inventory Management</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Track all inventory items and stock levels.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (showCreateForm) {
                    resetForm();
                  }
                  setShowCreateForm(!showCreateForm);
                }}
                className="px-4 py-2 rounded-lg bg-[#7311d4] text-white font-semibold hover:bg-[#7311d4]/90 transition-colors"
              >
                {showCreateForm ? 'Close Form' : 'Add Item'}
              </button>
              <div className="px-4 py-2 rounded-lg bg-[#7311d4]/10 text-[#7311d4] font-semibold">
                Total Items: {items.length}
              </div>
            </div>
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreateItem} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#2a1b3d]/30 rounded-xl border border-[#7311d4]/10 p-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Item Name</span>
                <input name="item_name" value={formData.item_name} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Category</span>
                <input name="category" value={formData.category} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Quantity Available</span>
                <input type="number" min="0" name="quantity_available" value={formData.quantity_available} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-300">Unit</span>
                <input name="unit" value={formData.unit} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">Minimum Threshold</span>
                <input type="number" min="0" name="minimum_threshold" value={formData.minimum_threshold} onChange={handleInputChange} required className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#2a1b3d] border border-slate-300 dark:border-[#7311d4]/20 text-slate-900 dark:text-slate-100" />
              </label>

              {formError ? <p className="md:col-span-2 text-sm text-red-500">{formError}</p> : null}

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#7311d4] text-white font-semibold disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          ) : null}

          <div className="bg-white dark:bg-[#2a1b3d]/30 rounded-xl border border-[#7311d4]/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#2a1b3d]/50 border-b border-[#7311d4]/10">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Item</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Available</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Unit</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Minimum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7311d4]/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading inventory...</td>
                    </tr>
                  ) : items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#7311d4]/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{item.item_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{item.category}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{item.quantity_available}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{item.unit}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">{item.minimum_threshold}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No inventory items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InventoryManagement;
