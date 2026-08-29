const fs = require('fs');
let js = fs.readFileSync('src/admin/expenses.js', 'utf8');

// Insert delete function
const newCode = `
    window.deleteSavedReceipt = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this receipt and all its items?")) return;
        try {
            await deleteDoc(doc(db, "expenses", id));
            if (window.closeReceiptSlide) window.closeReceiptSlide();
            showToast("Receipt permanently deleted.");
        } catch (e) {
            console.error("Error deleting receipt:", e);
            alert("Failed to delete receipt: " + e.message);
        }
    };

    window.openReceiptSlide = (receipt) => {
        const deleteBtn = document.getElementById('slide-delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => window.deleteSavedReceipt(receipt.id);
        }
`;

js = js.replace(/window\.openReceiptSlide = \(receipt\) => \{/g, () => newCode);

fs.writeFileSync('src/admin/expenses.js', js, 'utf8');
console.log('Added deleteSavedReceipt');
