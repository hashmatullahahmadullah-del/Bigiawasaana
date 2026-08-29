const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const oldEditorRegex = /<!-- Blog Feed Editor -->[\s\S]*?<\/form>\s*<\/div>/;

const v2Composer = `<!-- Blog Feed Editor (V2 Composer) -->
            <div id="blog-editor-section" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-admin); z-index: 100; overflow: hidden; flex-direction: column;">
              
              <!-- V2 Composer Header -->
              <div style="padding: 20px 40px; border-bottom: 1px solid var(--border-admin); display: flex; justify-content: space-between; align-items: center; background: var(--surface-admin);">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <button type="button" id="cancel-post-btn" class="crm-btn-icon" style="background: var(--hover-bg); border-radius: 50%;">←</button>
                  <span style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: var(--text-muted);" id="blog-editor-title">Draft in Progress</span>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                  <span id="blog-save-status" style="font-size: 13px; color: var(--text-muted); margin-right: 8px;">Saved</span>
                  <button type="button" id="save-draft-btn" class="btn-outline btn-small">Save Draft</button>
                  <button type="button" id="publish-post-btn" class="btn-primary btn-small">Publish Post</button>
                </div>
              </div>

              <!-- V2 Composer Body -->
              <div style="display: flex; flex: 1; overflow: hidden;">
                
                <!-- Main Editor Area -->
                <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; align-items: center;">
                  <div style="width: 100%; max-width: 800px; display: flex; flex-direction: column; gap: 24px;">
                    <input type="hidden" id="post-id">
                    <input type="hidden" id="post-published">
                    
                    <input type="text" id="post-title" required placeholder="Article Title..." style="font-size: 42px; font-weight: 700; border: none; background: transparent; color: var(--text-main); outline: none; font-family: 'Inter', sans-serif; padding: 0;" autocomplete="off">
                    
                    <div id="quill-editor" class="v2-quill" style="flex: 1; font-family: 'Inter', sans-serif; font-size: 18px; color: var(--text-main); border: none; padding: 0;"></div>
                  </div>
                </div>

                <!-- Right Sidebar (SEO & Settings) -->
                <div style="width: 350px; background: var(--surface-admin); border-left: 1px solid var(--border-admin); overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px;">
                  <h3 style="margin: 0; font-size: 16px;">SEO & Details</h3>
                  
                  <div class="crm-form-group">
                    <label class="form-label">URL Slug</label>
                    <input type="text" id="post-slug" class="crm-input" required placeholder="e.g. top-5-halal-spots" style="font-family: monospace; font-size: 13px !important;">
                  </div>

                  <div class="crm-form-group">
                    <label class="form-label">SEO Meta Description</label>
                    <textarea id="post-excerpt" class="crm-input" rows="3" placeholder="Optimized summary for Google Search..."></textarea>
                    <span style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">Optimal length: 150-160 characters.</span>
                  </div>

                  <div class="crm-form-group">
                    <label class="form-label">Focus Keywords</label>
                    <input type="text" id="post-keywords" class="crm-input" placeholder="e.g. halal, catering, afghan">
                  </div>

                  <div class="crm-form-group">
                    <label class="form-label">Cover Image</label>
                    <div style="border: 2px dashed var(--border-admin); padding: 16px; border-radius: var(--radius-md); text-align: center; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('post-cover-image').click()" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='transparent'">
                      <span style="font-size: 24px;">📸</span>
                      <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 500; color: var(--text-main);">Upload Cover</p>
                      <input type="file" id="post-cover-image" accept="image/*" style="display: none;">
                    </div>
                    <div id="post-cover-preview" style="margin-top: 12px; border-radius: var(--radius-md); overflow: hidden;"></div>
                  </div>
                </div>

              </div>
            </div>`;

html = html.replace(oldEditorRegex, v2Composer);
fs.writeFileSync('admin.html', html, 'utf8');
