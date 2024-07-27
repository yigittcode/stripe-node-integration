document.addEventListener('DOMContentLoaded', () => {
  const deleteButtons = document.querySelectorAll('.delete-btn');

  updateNoProductsMessage();

  deleteButtons.forEach(button => {
    button.addEventListener('click', async event => {
      event.preventDefault(); 

      const form = event.target.closest('form');
      if (!form) {
        console.error('Form bulunamadı.');
        return;
      }

      const csrfToken = form.querySelector('input[name="_csrf"]').value;
      const productID = form.querySelector('input[name="productID"]').value;

      console.log('CSRF Token:', csrfToken);
      console.log('Product ID:', productID);

      const url = `/admin/delete-product/${productID}/?_csrf=${csrfToken}`;
      try {
        const response = await fetch(url, { method: 'DELETE' });

        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }

        console.log('Response JSON:', await response.json());

        const article = form.closest('article');
        if (article) {
          article.remove();
          updateNoProductsMessage(); 
        }
      } catch (error) {
        console.error('Fetch error:', error.message);
      }
    });
  });

  function updateNoProductsMessage() {
    const noProductsMessage = document.querySelector('.no-products-message');
    const hasProducts = document.querySelectorAll('.product-item').length > 0;

    noProductsMessage.style.display = hasProducts ? 'none' : 'block';
  }
});
