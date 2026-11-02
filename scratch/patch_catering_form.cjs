const fs = require('fs');
let html = fs.readFileSync('catering.html', 'utf8');

const oldBlockStart = '<!-- Catering Form Section -->';
const oldBlockEnd = '<!-- SEO Section: Backlinks / Partners -->';

const startIndex = html.indexOf(oldBlockStart);
const endIndex = html.indexOf(oldBlockEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers in catering.html');
  process.exit(1);
}

const replacement = `<!-- Catering Form Section -->
    <section class="py-l halal-bg">
      <div class="container" style="padding: 0 16px; box-sizing: border-box;">
        <h2 class="font-lalezar" style="font-size: 32px; color: var(--white); margin-bottom: 24px; text-align: center;">Request a Traditional Quote</h2>
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 24px 20px; border-radius: 8px; max-width: 600px; width: 100%; box-sizing: border-box; margin: 0 auto;">
          
          <form id="catering-form" style="display: flex; flex-direction: column; gap: 16px; width: 100%; box-sizing: border-box;">
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px; width: 100%; box-sizing: border-box;">
              <div style="width: 100%; box-sizing: border-box;">
                <label for="cat-name" style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 8px;">Name</label>
                <input type="text" id="cat-name" placeholder="John Doe" style="width: 100%; max-width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); padding: 13px 14px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 6px;" required>
              </div>
              <div style="width: 100%; box-sizing: border-box;">
                <label for="cat-email" style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 8px;">Email</label>
                <input type="email" id="cat-email" placeholder="john@example.com" style="width: 100%; max-width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); padding: 13px 14px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 6px;" required>
              </div>
            </div>
  
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 14px; width: 100%; box-sizing: border-box;">
              <div style="width: 100%; box-sizing: border-box;">
                <label for="cat-phone" style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 8px;">Phone Number</label>
                <input type="tel" id="cat-phone" placeholder="(123) 456-7890" style="width: 100%; max-width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); padding: 13px 14px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 6px;" required>
              </div>
              <div style="width: 100%; box-sizing: border-box;">
                <label for="cat-date" style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 8px;">Event Date</label>
                <input type="date" id="cat-date" style="width: 100%; max-width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); padding: 13px 14px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 6px;" required>
              </div>
            </div>
  
            <div style="width: 100%; box-sizing: border-box;">
              <label for="cat-guests" style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 8px;">Guest Count (Approx.)</label>
              <input type="number" id="cat-guests" placeholder="e.g. 50" min="1" style="width: 100%; max-width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); padding: 13px 14px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 6px;" required>
            </div>
  
            <div style="width: 100%; box-sizing: border-box;">
              <label for="cat-details" style="font-family: 'Barlow Condensed'; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--gray); text-transform: uppercase; display: block; margin-bottom: 8px;">Event Details / Special Requests</label>
              <textarea id="cat-details" rows="4" placeholder="Tell us about your event..." style="width: 100%; max-width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); padding: 13px 14px; color: var(--white); font-family: 'Outfit'; font-size: 14px; border-radius: 6px; resize: vertical;" required></textarea>
            </div>
  
            <div id="cat-quote-display" style="display: none; padding: 16px; background: rgba(255, 153, 0, 0.1); border: 1px solid var(--accent); color: var(--accent); border-radius: 6px; text-align: center; margin-top: 8px; width: 100%; box-sizing: border-box;">
              <div style="font-family: 'Barlow Condensed'; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Estimated Quote</div>
              <div id="cat-quote-amount" style="font-size: 28px; font-weight: 700; margin: 4px 0;">$0</div>
              <div style="font-size: 12px; color: var(--gray);">Approximate base rate (~$18/guest). For itemized dishes and custom party trays, use our <a href="javascript:void(0)" onclick="window.openPackageBuilder(document.getElementById('cat-guests').value)" style="color: var(--accent); text-decoration: underline; font-weight: bold;">Custom Package Builder</a>.</div>
            </div>

            <button type="submit" id="cat-submit-btn" class="btn-primary" style="margin-top: 8px; width: 100%; justify-content: center;">Submit Inquiry</button>
            
            <div id="cat-status" style="display: none; padding: 16px; background: rgba(37, 211, 102, 0.1); border: 1px solid #25D366; color: #25D366; border-radius: 6px; text-align: center; margin-top: 8px; font-weight: bold; width: 100%; box-sizing: border-box;">
              Inquiry sent successfully! We will contact you soon.
            </div>
          </form>
  
        </div>
      </div>
    </section>

    `;

html = html.substring(0, startIndex) + replacement + html.substring(endIndex);
fs.writeFileSync('catering.html', html, 'utf8');
console.log('Successfully updated catering.html traditional inquiry form');
