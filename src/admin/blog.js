import { compressImage } from './menu.js';
import { showToast } from './orders.js';
import { db, storage } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


window.quill = null;
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Quill to be available
  const initQuill = setInterval(() => {
    if (window.Quill) {
      clearInterval(initQuill);
      window.quill = new window.Quill('#window.quill-editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }
      });

      // Custom image handler
      window.quill.getModule('toolbar').addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          try {
            const altText = prompt("Enter an image description for SEO (e.g. 'Halal chicken tikka kebab'):");
            if (!altText) {
              alert("SEO Warning: Image description is required to rank on Google Images.");
              return; // cancel upload if no alt text to force good SEO habits
            }
            
            // Re-use our compressImage logic
            const compressedFile = await compressImage(file, 1024);
            const storageRef = ref(storage, `img/blog/${Date.now()}_${compressedFile.name}`);
            await uploadBytes(storageRef, compressedFile);
            const url = await getDownloadURL(storageRef);
            
            const range = window.quill.getSelection();
            window.quill.insertEmbed(range.index, 'image', url);
            
            // Apply alt attribute to the newly inserted image
            setTimeout(() => {
              const images = document.querySelectorAll('#window.quill-editor img');
              images.forEach(img => {
                if (img.src === url) {
                  img.setAttribute('alt', altText);
                }
              });
            }, 100);
            
          } catch (e) {
            console.error(e);
            showToast('Image upload failed');
          }
        };
      });
    }
  }, 100);



  const addPostBtn = document.getElementById('add-post-btn');
  const cancelPostBtn = document.getElementById('cancel-post-btn');
  const blogForm = document.getElementById('blog-form');
  const blogEditorSection = document.getElementById('blog-editor-section');
  const blogList = document.getElementById('blog-list');
  const postCoverImage = document.getElementById('post-cover-image');
  let currentCoverUrl = '';

  addPostBtn?.addEventListener('click', () => {
    blogForm.reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-keywords').value = '';
    document.getElementById('post-cover-preview').innerHTML = '';
    currentCoverUrl = '';
    if(window.quill) window.quill.root.innerHTML = '';
    blogEditorSection.style.display = 'block';
    blogForm.scrollIntoView({ behavior: 'smooth' });
  });

  cancelPostBtn?.addEventListener('click', () => {
    blogEditorSection.style.display = 'none';
  });

  postCoverImage?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('post-cover-preview').innerHTML = 'Compressing & uploading...';
    try {
      const compressedFile = await compressImage(file, 1200);
      const storageRef = ref(storage, `img/blog/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      currentCoverUrl = await getDownloadURL(storageRef);
      document.getElementById('post-cover-preview').innerHTML = `<img src="${currentCoverUrl}" style="height: 100px; border-radius: 8px;">`;
    } catch (err) {
      console.error(err);
      document.getElementById('post-cover-preview').innerHTML = '<span style="color:red">Upload failed</span>';
    }
  });

  blogForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('post-id').value;
    const title = document.getElementById('post-title').value.trim();
    let slug = document.getElementById('post-slug').value.trim();
    if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const excerpt = document.getElementById('post-excerpt').value.trim();
    const keywords = document.getElementById('post-keywords').value.trim();
    const isPublished = document.getElementById('post-published').checked;
    const editorContent = window.quill ? window.quill.root.innerHTML : '';

    const postData = {
      title,
      slug,
      excerpt,
      keywords,
      content: editorContent,
      coverImage: currentCoverUrl,
      isPublished,
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'posts', id), postData);
        showToast('Post updated!');
      } else {
        postData.publishedAt = isPublished ? serverTimestamp() : null;
        await addDoc(collection(db, 'posts'), postData);
        showToast('Post created!');
      }
      blogEditorSection.style.display = 'none';
      loadBlogPosts();
    } catch (err) {
      console.error(err);
      showToast('Error saving post');
    }
  });

  // Auto-generate slug from title if empty
  document.getElementById('post-title')?.addEventListener('input', (e) => {
    const slugInput = document.getElementById('post-slug');
    if (!document.getElementById('post-id').value && (!slugInput.value || slugInput.dataset.auto === 'true')) {
      slugInput.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      slugInput.dataset.auto = 'true';
    }
  });
  document.getElementById('post-slug')?.addEventListener('input', (e) => {
    e.target.dataset.auto = 'false';
  });

  function loadBlogPosts() {
    if (!blogList) return;
    const q = query(collection(db, 'posts'), orderBy('updatedAt', 'desc'));
    onSnapshot(q, (snapshot) => {
      blogList.innerHTML = '';
      snapshot.forEach(docSnap => {
        const post = docSnap.data();
        const id = docSnap.id;
        
        const card = document.createElement('div');
        card.className = 'crm-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.innerHTML = `
          ${post.coverImage ? `<img src="${post.coverImage}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;">` : ''}
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <h3 style="margin: 0; font-size: 1.2rem;">${post.title}</h3>
            <span class="crm-badge ${post.isPublished ? 'status-success' : 'status-warning'}">${post.isPublished ? 'Live' : 'Draft'}</span>
          </div>
          <p style="color: var(--gray); font-size: 0.9rem; flex-grow: 1;">${post.excerpt || 'No excerpt'}</p>
          <div style="display: flex; justify-content: space-between; margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px;">
            <button class="btn-outline edit-post-btn" style="padding: 4px 12px; font-size: 0.9rem;">Edit</button>
            <button class="btn-outline delete-post-btn" style="padding: 4px 12px; font-size: 0.9rem; border-color: #ff4d4d; color: #ff4d4d;">Delete</button>
          </div>
        `;

        card.querySelector('.edit-post-btn').addEventListener('click', () => {
          document.getElementById('post-id').value = id;
          document.getElementById('post-title').value = post.title;
          document.getElementById('post-slug').value = post.slug;
          document.getElementById('post-excerpt').value = post.excerpt || '';
          document.getElementById('post-keywords').value = post.keywords || '';
          document.getElementById('post-published').checked = post.isPublished;
          currentCoverUrl = post.coverImage || '';
          if (currentCoverUrl) {
            document.getElementById('post-cover-preview').innerHTML = `<img src="${currentCoverUrl}" style="height: 100px; border-radius: 8px;">`;
          } else {
            document.getElementById('post-cover-preview').innerHTML = '';
          }
          if(window.quill) window.quill.root.innerHTML = post.content || '';
          
          blogEditorSection.style.display = 'block';
          blogForm.scrollIntoView({ behavior: 'smooth' });
        });

        card.querySelector('.delete-post-btn').addEventListener('click', async () => {
          if(confirm('Are you sure you want to delete this post?')) {
            await deleteDoc(doc(db, 'posts', id));
            showToast('Post deleted');
          }
        });

        blogList.appendChild(card);
      });
    });
  }

  // Load blog posts when tab is clicked
  const blogTabBtn = document.querySelector('[data-target="blog-management"]');
  if (blogTabBtn) {
    blogTabBtn.addEventListener('click', () => {
      loadBlogPosts();
    });
  }
});


