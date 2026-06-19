import React, { useEffect, useMemo, useState } from "react";
import "./VoucherinventoryUI.css";

const API_BASE = "https://truvish-backend-production.up.railway.app";

const emptyVoucherRow = () => ({
  voucher: "",
  pin: "",
  validityTill: "",
});

function Modal({ open, title, onClose, children, width = "900px" }) {
  if (!open) return null;


  return (
    <div className="vi-modal-overlay" onClick={onClose}>
      <div
        className="vi-modal"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vi-modal-header">
          <h2>{title}</h2>
          <button className="vi-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="vi-modal-body">{children}</div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="vi-info-card">
      <p className="vi-info-label">{label}</p>
      <h3 className="vi-info-value">{value}</h3>
    </div>
  );
}

export default function VoucherinventoryUI() {
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterDataMap, setCounterDataMap] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const [expandedBrand, setExpandedBrand] = useState(null);
  const [selectedDenominationMap, setSelectedDenominationMap] = useState({});


const maskVoucher = (voucher = "") => {
  if (!voucher) return "-";

  const parts = voucher.split("-");

  // agar hyphen hai to last part dikhao
  if (parts.length > 1) {
    return `XXXX-XXXX-${parts[parts.length - 1]}`;
  }

  // agar normal voucher hai
  const firstChar = voucher.charAt(0);
  return `${firstChar}XXXXXXX`;
};
/*========Uper check the==========*/


  const [form, setForm] = useState({
    brandName: "",
    denomination: "",
    addVouchers: [emptyVoucherRow()],
  });

  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    fetchBrands();
    fetchSummary();
  }, []);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const res = await fetch(`${API_BASE}/api/client-choose-brand`);
      if (!res.ok) throw new Error("Failed to load brands");
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/voucher-inventory/summary`);
      if (!res.ok) throw new Error("Failed to load summary");
      const data = await res.json();
      setSummary(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const validRows = useMemo(() => {
    return form.addVouchers.filter(
      (item) =>
        item.voucher.trim() &&
        item.pin.trim() &&
        item.validityTill
    );
  }, [form.addVouchers]);

  const voucherCount = useMemo(() => validRows.length, [validRows]);

  const total = useMemo(() => {
    const denomination = Number(form.denomination || 0);
    return denomination * voucherCount;
  }, [form.denomination, voucherCount]);

  const handleVoucherChange = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      addVouchers: prev.addVouchers.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addVoucherRow = () => {
    setForm((prev) => ({
      ...prev,
      addVouchers: [...prev.addVouchers, emptyVoucherRow()],
    }));
  };

  const removeVoucherRow = (index) => {
    setForm((prev) => ({
      ...prev,
      addVouchers:
        prev.addVouchers.length === 1
          ? [emptyVoucherRow()]
          : prev.addVouchers.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm({
      brandName: "",
      denomination: "",
      addVouchers: [emptyVoucherRow()],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.brandName) {
      alert("Please select brand.");
      return;
    }

    if (!form.denomination || Number(form.denomination) <= 0) {
      alert("Please enter valid denomination.");
      return;
    }

    if (validRows.length === 0) {
      alert("Please add at least one voucher, pin, and validity date.");
      return;
    }

    const hasInvalidPastDate = validRows.some(
      (item) => item.validityTill < today
    );

    if (hasInvalidPastDate) {
      alert("Voucher validity date cannot be in the past.");
      return;
    }

    const hasIncompleteRows = form.addVouchers.some(
      (item) =>
        item.voucher.trim() ||
        item.pin.trim() ||
        item.validityTill
          ? !(item.voucher.trim() && item.pin.trim() && item.validityTill)
          : false
    );

    if (hasIncompleteRows) {
      alert("Please complete voucher, pin, and validity date in each filled row.");
      return;
    }

    const payload = {
      brandName: form.brandName,
      denomination: Number(form.denomination),
      addVouchers: validRows.map((item) => ({
        voucher: item.voucher.trim(),
        pin: item.pin.trim(),
        validityTill: item.validityTill,
      })),
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/voucher-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save voucher inventory");
      }

      await fetchSummary();
      resetForm();
      setVoucherModalOpen(false);
      alert("Voucher inventory saved successfully.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedSummary = useMemo(() => {
    const grouped = {};

    summary.forEach((item) => {
      const brandName = item.brandName || "";
      const denomination = String(item.denomination);

      if (!grouped[brandName]) {
        grouped[brandName] = {
          brandName,
          totalBalance: 0,
          denominations: {},
        };
      }

      if (!grouped[brandName].denominations[denomination]) {
        grouped[brandName].denominations[denomination] = {
          denomination,
          totalCount: 0,
          activeCount: 0,
          usedCount: 0,
          total: 0,
        };
      }

      grouped[brandName].denominations[denomination].totalCount += Number(item.totalCount || 0);
      grouped[brandName].denominations[denomination].activeCount += Number(item.activeCount || 0);
      grouped[brandName].denominations[denomination].usedCount += Number(item.usedCount || 0);
      grouped[brandName].denominations[denomination].total += Number(item.total || 0);

      grouped[brandName].totalBalance += Number(item.total || 0);
    });

    return Object.values(grouped).sort((a, b) =>
      a.brandName.localeCompare(b.brandName)
    );
  }, [summary]);

  const fetchCounterByBrandAndDenomination = async (brandName, denomination) => {
    const key = `${brandName}__${denomination}`;

    if (counterDataMap[key]) return;

    setCounterLoading(true);
    try {
      const params = new URLSearchParams({
        brandName,
        denomination: String(denomination),
      });

      const res = await fetch(
        `${API_BASE}/api/voucher-inventory/counter?${params.toString()}`
      );

      if (!res.ok) throw new Error("Failed to load counter details");
      const data = await res.json();

      setCounterDataMap((prev) => ({
        ...prev,
        [key]: Array.isArray(data) ? data : [],
      }));
    } catch (error) {
      console.error(error);
      setCounterDataMap((prev) => ({
        ...prev,
        [key]: [],
      }));
    } finally {
      setCounterLoading(false);
    }
  };

  const handleToggleBrand = async (brandName, brandItem) => {
    if (expandedBrand === brandName) {
      setExpandedBrand(null);
      return;
    }

    setExpandedBrand(brandName);

    const denominationKeys = Object.keys(brandItem.denominations).sort(
      (a, b) => Number(a) - Number(b)
    );

    if (!selectedDenominationMap[brandName] && denominationKeys.length > 0) {
      const firstDenomination = denominationKeys[0];
      setSelectedDenominationMap((prev) => ({
        ...prev,
        [brandName]: firstDenomination,
      }));
      await fetchCounterByBrandAndDenomination(brandName, firstDenomination);
    } else if (selectedDenominationMap[brandName]) {
      await fetchCounterByBrandAndDenomination(
        brandName,
        selectedDenominationMap[brandName]
      );
    }
  };

  const handleDenominationClick = async (brandName, denomination) => {
    setSelectedDenominationMap((prev) => ({
      ...prev,
      [brandName]: denomination,
    }));
    await fetchCounterByBrandAndDenomination(brandName, denomination);
  };

  const handleDeleteVoucher = async (id, brandName, denomination) => {
    const confirmed = window.confirm("Are you sure you want to delete this voucher?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/voucher-inventory/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete voucher");
      }

      const key = `${brandName}__${denomination}`;
      setCounterDataMap((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((item) => item.id !== id),
      }));

      await fetchSummary();
    } catch (error) {
      console.error(error);
      alert(error.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="vi-page">
      <div className="vi-container">
        <div className="vi-topbar vi-topbar-centered">
          <div>
            <h1 className="vi-title">Voucher Inventory</h1>
            <p className="vi-subtitle">
              Manage brand vouchers, denomination, validity, and inventory details with Truvish styling.
            </p>
          </div>
        </div>

        <div className="vi-grid">
          <div className="vi-card">
            <div className="vi-card-header">
              <h2>Add Voucher Inventory</h2>
            </div>

            <form className="vi-card-body" onSubmit={handleSubmit}>
              <div className="vi-form-grid">
                <div className="vi-field">
                  <label>Brand Name</label>
                  <select
                    value={form.brandName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, brandName: e.target.value }))
                    }
                  >
                    <option value="">
                      {loadingBrands ? "Loading brands..." : "Select brand"}
                    </option>
                    {brands.map((brand, index) => {
                      const value =
                        typeof brand === "string"
                          ? brand
                          : brand?.brandName || brand?.name || "";
                      return (
                        <option key={`${value}-${index}`} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="vi-field">
                  <label>Denomination</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter denomination"
                    value={form.denomination}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        denomination: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="vi-form-grid">
                <div className="vi-field">
                  <label>Voucher</label>
                  <button
                    type="button"
                    className="vi-btn vi-btn-secondary vi-full"
                    onClick={() => setVoucherModalOpen(true)}
                  >
                    Add Voucher + Pin + Validity
                  </button>
                </div>
              </div>

              <div className="vi-info-grid">
                <InfoCard label="Count" value={voucherCount} />
                <InfoCard label="Total" value={`₹ ${total || 0}`} />
                <InfoCard label="Selected Brand" value={form.brandName || "-"} />
                <InfoCard label="Denomination" value={form.denomination || "-"} />
              </div>

              <div className="vi-actions">
                <button className="vi-btn vi-btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Inventory"}
                </button>
                <button
                  className="vi-btn vi-btn-secondary"
                  type="button"
                  onClick={resetForm}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div className="vi-card">
            <div className="vi-card-header">
              <h2>Live Preview</h2>
            </div>

            <div className="vi-card-body">
              <div className="vi-preview-box">
                <div className="vi-preview-head">
                  <h3>Inventory Snapshot</h3>
                  <span className="vi-badge">{voucherCount} Vouchers</span>
                </div>

                <div className="vi-preview-row">
                  <span>Brand Name</span>
                  <strong>{form.brandName || "-"}</strong>
                </div>
                <div className="vi-preview-row">
                  <span>Denomination</span>
                  <strong>{form.denomination || "-"}</strong>
                </div>
                <div className="vi-preview-row">
                  <span>Count</span>
                  <strong>{voucherCount}</strong>
                </div>
                <div className="vi-preview-row">
                  <span>Total</span>
                  <strong>₹ {total || 0}</strong>
                </div>
              </div>

              <div className="vi-preview-box">
                <h3 className="vi-preview-list-title">Added Voucher Preview</h3>
                <div className="vi-preview-list">
                  {form.addVouchers.filter(
                    (v) => v.voucher || v.pin || v.validityTill
                  ).length === 0 ? (
                    <p className="vi-empty-text">No vouchers added yet.</p>
                  ) : (
                    form.addVouchers.map((item, idx) => (
                      <div className="vi-voucher-preview-item" key={idx}>
                        <span>{maskVoucher(item.voucher)}</span>
                        <span>PIN: {item.pin || "-"}</span>
                        <span>Validity: {item.validityTill || "-"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="vi-card">
          <div className="vi-card-header">
            <h2>Counter</h2>
          </div>

          <div className="vi-card-body">
            {summaryLoading ? (
              <div className="vi-center-box">Loading summary...</div>
            ) : groupedSummary.length === 0 ? (
              <div className="vi-center-box">No inventory found.</div>
            ) : (
              <div className="vi-brand-counter-list">
                {groupedSummary.map((brandItem) => {
                  const brandName = brandItem.brandName;
                  const denominations = Object.values(brandItem.denominations).sort(
                    (a, b) => Number(a.denomination) - Number(b.denomination)
                  );

                  const selectedDenomination = selectedDenominationMap[brandName];
                  const selectedKey = `${brandName}__${selectedDenomination}`;
                  const selectedRows = counterDataMap[selectedKey] || [];

                  return (
                    <div className="vi-brand-counter-card" key={brandName}>
                      <button
                        type="button"
                        className="vi-brand-counter-header"
                        onClick={() => handleToggleBrand(brandName, brandItem)}
                      >
                        <div className="vi-brand-counter-left">
                          <span className="vi-brand-toggle-btn">
                            {expandedBrand === brandName ? "−" : "/"}
                          </span>
                          <div>
                            <h3>{brandName}</h3>
                            <p>Balance: ₹ {brandItem.totalBalance}</p>
                          </div>
                        </div>
                      </button>

                      {expandedBrand === brandName && (
                        <div className="vi-brand-counter-body">
                          <div className="vi-denomination-list">
                            {denominations.map((denom) => (
                              <button
                                key={`${brandName}-${denom.denomination}`}
                                type="button"
                                className={`vi-denomination-box ${
                                  selectedDenomination === denom.denomination ? "active" : ""
                                }`}
                                onClick={() =>
                                  handleDenominationClick(brandName, denom.denomination)
                                }
                              >
                                <span className="vi-denomination-title">
                                  {denom.denomination}
                                </span>
                                <span className="vi-denomination-sub">
                                  Count: {denom.totalCount}
                                </span>
                              </button>
                            ))}
                          </div>

                          {selectedDenomination && (
                            <div className="vi-denomination-table-wrap">
                              <div className="vi-denomination-table-head">
                                <h4>
                                  {brandName} / {selectedDenomination}
                                </h4>
                              </div>

                              <div className="vi-table-wrap">
                                <table className="vi-table">
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Voucher</th>
                                      <th>Pin</th>
                                      <th>Validity</th>
                                      <th>Status</th>
                                      <th>Delete</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {counterLoading ? (
                                      <tr>
                                        <td colSpan="6" className="vi-center">
                                          Loading details...
                                        </td>
                                      </tr>
                                    ) : selectedRows.length === 0 ? (
                                      <tr>
                                        <td colSpan="6" className="vi-center">
                                          No details found.
                                        </td>
                                      </tr>
                                    ) : (
                                      selectedRows.map((row, index) => (
                                        <tr
                                          key={`${row.id}-${index}`}
                                          className={row.status === "USED" ? "vi-row-used" : ""}
                                        >
                                          <td>{index + 1}</td>
                                          <td>{maskVoucher(row.voucher)}</td>
                                          <td>{row.pin}</td>
                                          <td>{row.validityTill}</td>
                                          <td>
                                            <span
                                              className={
                                                row.status === "USED"
                                                  ? "vi-status-used"
                                                  : "vi-status-active"
                                              }
                                            >
                                              {row.status}
                                            </span>
                                          </td>
                                          <td>
                                            <button
                                              type="button"
                                              className="vi-btn vi-btn-danger"
                                              disabled={deletingId === row.id}
                                              onClick={() =>
                                                handleDeleteVoucher(
                                                  row.id,
                                                  brandName,
                                                  selectedDenomination
                                                )
                                              }
                                            >
                                              {deletingId === row.id ? "Deleting..." : "Delete"}
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={voucherModalOpen}
        title="Add Voucher, Pin and Validity"
        onClose={() => setVoucherModalOpen(false)}
      >
        <div className="vi-modal-list">
          {form.addVouchers.map((item, index) => (
            <div className="vi-voucher-row" key={index}>
              <div className="vi-field">
                <label>Voucher</label>
                <input
                  type="text"
                  placeholder="Enter voucher code"
                  value={item.voucher}
                  onChange={(e) =>
                    handleVoucherChange(index, "voucher", e.target.value)
                  }
                />
              </div>

              <div className="vi-field">
                <label>Pin</label>
                <input
                  type="text"
                  placeholder="Enter pin"
                  value={item.pin}
                  onChange={(e) =>
                    handleVoucherChange(index, "pin", e.target.value)
                  }
                />
              </div>

              <div className="vi-field">
                <label>Validity Till</label>
                <input
                  type="date"
                  min={today}
                  value={item.validityTill}
                  onChange={(e) =>
                    handleVoucherChange(index, "validityTill", e.target.value)
                  }
                />
              </div>

              <div className="vi-voucher-delete">
                <button
                  type="button"
                  className="vi-btn vi-btn-danger"
                  onClick={() => removeVoucherRow(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="vi-modal-footer">
          <button className="vi-btn vi-btn-secondary" type="button" onClick={addVoucherRow}>
            + Add More
          </button>
          <span className="vi-badge">Current Count: {voucherCount}</span>
        </div>
      </Modal>
    </div>
  );
}
