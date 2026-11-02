const fs = require('fs');

let html = fs.readFileSync('quote.html', 'utf8').replace(/\r\n/g, '\n');

const startStr = '<!-- Section B: Square Payment Module (Shown once accepted or if deposit awaiting) -->';
const endStr = '<!-- Section C: Payment Receipt & Confirmed Booking Card (shown when deposit or full is paid) -->';

const startIndex = html.indexOf(startStr);
const endIndex = html.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find start or end index in quote.html');
  process.exit(1);
}

const replacement = `<!-- Section B: Square Payment Module (Shown once accepted or if deposit awaiting) -->
        <div class="portal-card" id="portal-payment-card" style="display: none; margin-bottom: 24px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 12px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <span>Secure Deposit Payment</span>
          </h2>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; margin-bottom: 8px;">Select Payment Amount</label>
            
            <div class="payment-option-pill active" id="pill-opt-deposit" onclick="window.selectPaymentOption('deposit')">
              <input type="radio" name="pay_option" id="radio-pay-deposit" checked style="accent-color: #ff4500;">
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 14px; color: #fff;" id="label-pay-deposit-title">Pay 30% Booking Deposit</div>
                <div style="font-size: 12px; color: #888;">Locks in your event date immediately</div>
              </div>
              <div style="font-size: 16px; font-weight: 800; color: #10b981;" id="pay-deposit-val">$0.00</div>
            </div>

            <div class="payment-option-pill" id="pill-opt-full" onclick="window.selectPaymentOption('full')">
              <input type="radio" name="pay_option" id="radio-pay-full" style="accent-color: #ff4500;">
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 14px; color: #fff;">Pay Full Amount Today</div>
                <div style="font-size: 12px; color: #888;">Complete event balance paid in advance</div>
              </div>
              <div style="font-size: 16px; font-weight: 800; color: #fff;" id="pay-full-val">$0.00</div>
            </div>
          </div>

          <!-- Express Digital Wallets (Apple Pay & Google Pay) -->
          <div id="digital-wallets" style="margin-bottom: 16px;">
            <div id="apple-pay-button"></div>
            <div id="google-pay-button"></div>
            
            <div id="wallets-or-divider" class="wallet-divider">
              <div class="wallet-divider-line"></div>
              <span class="wallet-divider-text">OR PAY WITH CARD</span>
              <div class="wallet-divider-line"></div>
            </div>
          </div>

          <!-- Square Card Elements Container -->
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; margin-bottom: 8px;">Card Details</label>
            <div id="card-container"></div>
          </div>

          <div id="payment-error-msg" style="display: none; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 10px; border-radius: 6px; font-size: 13px; margin: 12px 0;"></div>

          <button type="button" id="btn-submit-payment" onclick="window.handlePaymentSubmit()" class="btn-primary" style="width: 100%; padding: 14px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span id="btn-pay-text">Pay 30% Deposit — $0.00</span>
          </button>

          <!-- Payment Processing State -->
          <div id="portal-payment-processing" style="display: none; text-align: center; padding: 20px 0;">
            <div style="width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.15); border-top-color: #ff4500; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
            <div style="font-weight: 600; font-size: 14px; color: #fff;">Authorizing Secure Payment via Square...</div>
            <div style="font-size: 12px; color: #888; margin-top: 4px;">Please do not refresh or close this window.</div>
          </div>

          <div style="font-size: 11px; color: #777; text-align: center; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>256-bit encrypted payment processed via Square</span>
          </div>
        </div>

        `;

html = html.substring(0, startIndex) + replacement + html.substring(endIndex);
fs.writeFileSync('quote.html', html, 'utf8');
console.log('Successfully updated quote.html Section B!');
