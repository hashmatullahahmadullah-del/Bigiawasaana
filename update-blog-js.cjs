const fs = require('fs');
let js = fs.readFileSync('src/admin/blog.js', 'utf8');

// Replace blogForm with save logic
const saveLogic = `
  const saveDraftBtn = document.getElementById('save-draft-btn');
  const publishPostBtn = document.getElementById('publish-post-btn');
  
  const savePost = async (isPublished) => {
    const id = document.getElementById('post-id').value;
    const title = document.getElementById('post-title').value.trim();
    if (!title) {
      alert("Title is required!");
      return;
    }

    let slug = document.getElementById('post-slug').value.trim();
    if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const excerpt = document.getElementById('post-excerpt').value.trim();
    const keywords = document.getElementById('post-keywords').value.trim();
    const editorContent = window.quill ? window.quill.root.innerHTML : '';
    
    // Hidden published checkbox state update
    document.getElementById('post-published').value = isPublished ? 'true' : 'false';

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

    document.getElementById('blog-save-status').textContent = 'Saving...';

    try {
      if (id) {
        await updateDoc(doc(db, 'posts', id), postData);
        showToast('Post updated!');
      } else {
        postData.publishedAt = isPublished ? serverTimestamp() : null;
        const newDoc = await addDoc(collection(db, 'posts'), postData);
        document.getElementById('post-id').value = newDoc.id;
        showToast('Post created!');
      }
      document.getElementById('blog-save-status').textContent = isPublished ? 'Published' : 'Saved Draft';
      loadBlogPosts();
      
      // If we clicked publish, close the composer automatically
      if (isPublished) {
        blogEditorSection.style.display = 'none';
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving post');
      document.getElementById('blog-save-status').textContent = 'Error Saving';
    }
  };

  saveDraftBtn?.addEventListener('click', () => savePost(false));
  publishPostBtn?.addEventListener('click', () => savePost(true));
`;

// Replace `blogForm?.addEventListener('submit', async (e) => { ... });`
js = js.replace(/blogForm\?\.addEventListener\('submit'[\s\S]*?\}\);/, saveLogic);

// Replace `blogForm.reset()` calls in the file
js = js.replace(/blogForm\.reset\(\);/g, `
    document.getElementById('post-title').value = '';
    document.getElementById('post-slug').value = '';
    document.getElementById('post-excerpt').value = '';
    document.getElementById('post-published').value = 'false';
    document.getElementById('blog-save-status').textContent = 'Draft in Progress';
`);

js = js.replace(/blogForm\.scrollIntoView\(\{ behavior: 'smooth' \}\);/g, '');

// Also fix `post.isPublished` checked state
js = js.replace(/document\.getElementById\('post-published'\)\.checked = post\.isPublished;/g, `document.getElementById('post-published').value = post.isPublished ? 'true' : 'false';`);

// Also fix initialization to hide body overflow when editor is open
js = js.replace(/blogEditorSection\.style\.display = 'block';/g, "blogEditorSection.style.display = 'flex'; document.body.style.overflow = 'hidden';");
js = js.replace(/blogEditorSection\.style\.display = 'none';/g, "blogEditorSection.style.display = 'none'; document.body.style.overflow = '';");


fs.writeFileSync('src/admin/blog.js', js, 'utf8');
