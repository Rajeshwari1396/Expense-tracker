// ==========================================
// 1. SETUP & DEPENDENCIES
// ==========================================
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Added to support JSON parsing if needed

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/expense_db')
  .then(() => console.log('Connected to Expense Database successfully!'))
  .catch(err => console.error('Database connection error:', err));

// ==========================================
// 2. DATABASE SCHEMA & MODEL
// ==========================================
const ExpenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  paymentMethod: { type: String, default: 'Cash' }, // NEW: Payment method field
  notes: { type: String, default: '' },            // NEW: Optional notes field
  date: { type: Date, default: Date.now }
});

const Expense = mongoose.model('Expense', ExpenseSchema);

// ==========================================
// 3. ROUTES & APPLICATION LOGIC
// ==========================================

// ROUTE 1: Display Dashboard, Filter, Analytics & Expenses
app.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Fetch all logged expenses
    const expenses = await Expense.find({}).sort({ date: -1 });

    // Current Date context for filtering/defaults
    const now = new Date();
    const currentMonth = month ? parseInt(month) : now.getMonth() + 1;
    const currentYear = year ? parseInt(year) : now.getFullYear();

    // Filter expenses for selected month & year
    const filteredExpenses = expenses.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
    });

    // Calculate Totals (Overall vs Monthly/Yearly)
    let totalOverall = 0;
    expenses.forEach(item => totalOverall += item.amount);

    let totalFiltered = 0;
    filteredExpenses.forEach(item => totalFiltered += item.amount);

    // Calculate Spending by Category for the selected month
    const categoryTotals = {};
    filteredExpenses.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });

    // Define Category Budgets (You can customize these limits)
    const categoryBudgets = {
      "Food": 5000,
      "Transport": 3000,
      "Bills": 10000,
      "Entertainment": 4000,
      "Other": 2000
    };

    // Build Category Progress Cards HTML with Budget Warning checks
    let categoryCardsHTML = '';
    for (const [cat, limit] of Object.entries(categoryBudgets)) {
      const spent = categoryTotals[cat] || 0;
      const percentage = Math.min(Math.round((spent / limit) * 100), 100);
      const isOverBudget = spent > limit;
      const barColor = isOverBudget ? '#e53e3e' : (percentage > 80 ? '#dd6b20' : '#3182ce');

      categoryCardsHTML += `
        <div style="background: white; padding: 12px 15px; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #2d3748; margin-bottom: 5px;">
            <span>${cat}</span>
            <span style="color: ${isOverBudget ? '#e53e3e' : '#4a5568'};">₹${spent.toFixed(2)} / ₹${limit} ${isOverBudget ? '⚠️ OVER BUDGET!' : ''}</span>
          </div>
          <div style="background: #edf2f7; border-radius: 4px; height: 8px; width: 100%; overflow: hidden;">
            <div style="background: ${barColor}; height: 100%; width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    }

    // Build Expense Rows HTML
    const expenseRowsHTML = filteredExpenses.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 15px; margin-bottom: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 5px solid #4a5568;">
        <div>
          <strong style="font-size: 16px; color: #2d3748;">${item.title}</strong>
          <span style="margin-left: 8px; font-size: 11px; background: #e2e8f0; color: #4a5568; padding: 2px 6px; border-radius: 10px;">${item.category}</span>
          <span style="margin-left: 4px; font-size: 11px; background: #feebc8; color: #744210; padding: 2px 6px; border-radius: 10px;">${item.paymentMethod}</span>
          ${item.notes ? `<div style="font-size: 12px; color: #718096; margin-top: 2px;">Note: ${item.notes}</div>` : ''}
          <div style="font-size: 11px; color: #a0aec0; margin-top: 3px;">${new Date(item.date).toLocaleDateString()}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <span style="font-size: 18px; font-weight: bold; color: #e53e3e;">₹${item.amount.toFixed(2)}</span>
          <form action="/delete-expense/${item._id}" method="POST" style="margin: 0;">
            <button type="submit" style="background: none; border: none; color: #cbd5e0; cursor: pointer; font-size: 16px;" title="Delete">🗑</button>
          </form>
        </div>
      </div>
    `).join('');

    // HTML Output sent directly to user's screen
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Advanced Personal Expense Tracker</title>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; background: #f7fafc; padding: 30px 20px; margin: 0;">
        
        <div style="max-width: 650px; margin: 0 auto;">
          <h2 style="text-align: center; color: #2d3748; margin-bottom: 25px;">📊 Advanced Expense Dashboard</h2>
          
          <!-- Month/Year Filter Bar -->
          <form method="GET" action="/" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; color: #4a5568; font-size: 14px;">Filter Period:</div>
            <div style="display: flex; gap: 10px;">
              <select name="month" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px;">
                <option value="1" ${currentMonth === 1 ? 'selected' : ''}>January</option>
                <option value="2" ${currentMonth === 2 ? 'selected' : ''}>February</option>
                <option value="3" ${currentMonth === 3 ? 'selected' : ''}>March</option>
                <option value="4" ${currentMonth === 4 ? 'selected' : ''}>April</option>
                <option value="5" ${currentMonth === 5 ? 'selected' : ''}>May</option>
                <option value="6" ${currentMonth === 6 ? 'selected' : ''}>June</option>
                <option value="7" ${currentMonth === 7 ? 'selected' : ''}>July</option>
                <option value="8" ${currentMonth === 8 ? 'selected' : ''}>August</option>
                <option value="9" ${currentMonth === 9 ? 'selected' : ''}>September</option>
                <option value="10" ${currentMonth === 10 ? 'selected' : ''}>October</option>
                <option value="11" ${currentMonth === 11 ? 'selected' : ''}>November</option>
                <option value="12" ${currentMonth === 12 ? 'selected' : ''}>December</option>
              </select>
              <select name="year" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px;">
                <option value="2025" ${currentYear === 2025 ? 'selected' : ''}>2025</option>
                <option value="2026" ${currentYear === 2026 ? 'selected' : ''}>2026</option>
                <option value="2027" ${currentYear === 2027 ? 'selected' : ''}>2027</option>
              </select>
              <button type="submit" style="background: #4a5568; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Apply</button>
            </div>
          </form>

          <!-- Summary Cards -->
          <div style="display: flex; gap: 15px; margin-bottom: 25px;">
            <div style="flex: 1; background: #3182ce; color: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase;">Selected Month Spent</p>
              <h2 style="margin: 5px 0 0 0; font-size: 28px;">₹${totalFiltered.toFixed(2)}</h2>
            </div>
            <div style="flex: 1; background: #2b6cb0; color: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(43, 108, 176, 0.2);">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase;">All-Time Spent</p>
              <h2 style="margin: 5px 0 0 0; font-size: 28px;">₹${totalOverall.toFixed(2)}</h2>
            </div>
          </div>

          <!-- Budget Limits & Progress Dashboard -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #4a5568; margin-bottom: 12px;">🎯 Category Budget Status</h3>
            ${categoryCardsHTML}
          </div>

          <!-- Voice Input Assistant Card -->
          <div style="background: #edf2f7; border: 2px dashed #cbd5e0; padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
            <h3 style="margin: 0 0 8px 0; color: #2d3748; font-size: 16px;">🎙 Travel Voice Assistant</h3>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #718096;">Click & speak naturally. Example: <em>"Lunch 250 Food"</em> or <em>"Cab 450 Transport"</em></p>
            <button type="button" id="mic-btn" onclick="startVoiceInput()" style="background: #e53e3e; color: white; border: none; padding: 10px 20px; font-size: 14px; border-radius: 20px; cursor: pointer; font-weight: bold;">🎤 Tap to Speak</button>
            <p id="voice-status" style="font-size: 12px; color: #4a5568; margin: 8px 0 0 0; font-style: italic;"></p>
          </div>

          <!-- Form to Insert New Expense -->
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-top: 0; color: #4a5568;">Log New Expense</h3>
            <form action="/add-expense" method="POST" id="expense-form">
              <input type="text" id="title" name="title" placeholder="What did you buy? (e.g., Coffee)" style="width: 95%; padding: 10px; margin-bottom: 12px; border: 1px solid #cbd5e0; border-radius: 4px;" required /><br>
              <input type="number" id="amount" name="amount" step="0.01" placeholder="Amount (in ₹)" style="width: 95%; padding: 10px; margin-bottom: 12px; border: 1px solid #cbd5e0; border-radius: 4px;" required /><br>
              
              <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                <select id="category" name="category" style="flex: 1; padding: 10px; border: 1px solid #cbd5e0; border-radius: 4px; background: white;" required>
                  <option value="" disabled selected>Select Category</option>
                  <option value="Food">Food & Drinks</option>
                  <option value="Transport">Transportation</option>
                  <option value="Bills">Bills & Utilities</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
                <select name="paymentMethod" style="flex: 1; padding: 10px; border: 1px solid #cbd5e0; border-radius: 4px; background: white;">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / Google Pay</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                </select>
              </div>
              
              <input type="text" name="notes" placeholder="Optional notes (e.g., With office friends)" style="width: 95%; padding: 10px; margin-bottom: 15px; border: 1px solid #cbd5e0; border-radius: 4px;" /><br>

              <button type="submit" style="width: 100%; background: #38a169; color: white; border: none; padding: 12px; font-size: 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Add Expense Log</button>
            </form>
          </div>

          <!-- History Feed -->
          <div>
            <h3 style="color: #4a5568; margin-bottom: 15px;">Expense History (${filteredExpenses.length})</h3>
            ${expenseRowsHTML.length > 0 ? expenseRowsHTML : '<p style="text-align: center; color: #a0aec0; margin-top: 20px;">No expenses recorded for this month.</p>'}
          </div>
        </div>

        <!-- Voice Recognition Client Script -->
        <script>
          function startVoiceInput() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
              alert("Your browser does not support voice recognition. Please use Google Chrome or Microsoft Edge.");
              return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            const statusEl = document.getElementById('voice-status');
            statusEl.innerText = "Listening... Speak now (e.g., 'Dinner 450 Food')";

            recognition.onresult = function(event) {
              const speechText = event.results[0][0].transcript;
              statusEl.innerText = "Heard: \\"" + speechText + "\\"";
              
              // Basic smart text parser: Look for the last number as amount
              const parts = speechText.split(' ');
              let amountVal = '';
              let titleWords = [];
              
              parts.forEach(word => {
                if (!isNaN(word)) {
                  amountVal = word;
                } else {
                  titleWords.push(word);
                }
              });

              if (titleWords.length > 0 && amountVal) {
                document.getElementById('title').value = titleWords.join(' ');
                document.getElementById('amount').value = amountVal;
                
                // Smart category guess matching
                const fullText = speechText.toLowerCase();
                if (fullText.includes('food') || fullText.includes('lunch') || fullText.includes('coffee') || fullText.includes('dinner')) {
                  document.getElementById('category').value = 'Food';
                } else if (fullText.includes('cab') || fullText.includes('train') || fullText.includes('auto') || fullText.includes('petrol')) {
                  document.getElementById('category').value = 'Transport';
                } else if (fullText.includes('bill') || fullText.includes('electricity') || fullText.includes('wifi')) {
                  document.getElementById('category').value = 'Bills';
                }
                
                statusEl.innerText = "Successfully parsed! Review form and click Add.";
              } else {
                statusEl.innerText = "Could not parse clearly. Please try again or type manually.";
              }
            };

            recognition.onerror = function(event) {
              statusEl.innerText = "Error occurred in recognition: " + event.error;
            };

            recognition.start();
          }
        </script>

      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading dashboard: ' + error.message);
  }
});

// ROUTE 2: Handle incoming form submissions
app.post('/add-expense', async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, notes } = req.body;
    
    const newExpense = new Expense({
      title,
      amount: parseFloat(amount),
      category,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || ''
    });

    await newExpense.save();
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error creating expense record: ' + error.message);
  }
});

// ROUTE 3: Delete an item completely
app.post('/delete-expense/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Error removing data record: ' + error.message);
  }
});

// ==========================================
// 4. START WEB SERVER
// ==========================================
app.listen(3000, () => {
  console.log('Advanced Expense Tracker running smoothly at http://localhost:3000');
});