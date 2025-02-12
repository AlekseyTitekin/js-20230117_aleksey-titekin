import escapeHtml from './utils/escape-html.js';
import fetchJson from './utils/fetch-json.js';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

export default class ProductForm {
  dataProduct = {};
  dataCategories = [];
  defaultFormData = {
    id: '',
    title: '',
    description: '',
    quantity: 1,
    subcategory: '',
    status: 1,
    price: 100,
    discount: 0,
    images: []
  };

  onSubmit = event => {
    event.preventDefault();
    this.save();
  }

  constructor (productId) {
    this.productId = productId;  
  }

  async render () {
    const promiseCategories = this.getCategories();
    const promiseProduct = this.getProduct();

    const [[ product ], categories ] = await Promise.all([promiseProduct, promiseCategories]);
    
    this.dataProduct = product;
    this.dataCategories = categories;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.getTemplates();
    this.element = wrapper.firstElementChild;
    this.subElements = this.getSubElements();

    this.fillCategories(this.element, this.dataCategories);    
    this.fillForm(this.element, this.dataProduct);

    this.initEventListeners();
    
    return this.element;
  }

  fillCategories(root, categories) {

    const select = root.querySelector('#subcategory')

    categories.forEach( category => {
        category.subcategories.forEach(subCategory => {
          const option = new Option(`${category.title} > ${subCategory.title}`, subCategory.id);
          select.append(option);    
        } )
      }
    );    
  }

  fillForm(root, product) {
    const fields = Object.entries(product);
    fields.forEach(item => {
      const [field, value] = item;
      const elem = root.querySelector(`#${field}`);
      if (elem) {
        if (field === 'images') {
          elem.innerHTML = this.fillImages(value);
        } else {
          elem.value = value
        }
      }
    })
  }

  fillImages(images) {
    return `
    <ul class="sortable-list">
      ${images.map( image => {
          return `
            <li class="products-edit__imagelist-item sortable-list__item" style="">
              <input type="hidden" name="url" value="${image.url}">
              <input type="hidden" name="source" value="${image.source}">
              <span>
                <img src="icon-grab.svg" data-grab-handle="" alt="grab">
                <img class="sortable-table__cell-img" alt="Image" src="${image.url}">
                <span>${image.source}</span>
              </span>
              <button type="button">
                <img src="icon-trash.svg" data-delete-handle="" alt="delete">
              </button>
            </li>         
          `
        }
      ).join("")}
    </ul>
    `
  }

  initEventListeners() {
    this.subElements.productForm.addEventListener('submit', this.onSubmit);
  }

  getTemplates() {
    return `
      <div class="product-form">
        <form data-element="productForm" class="form-grid">
          <div class="form-group form-group__half_left">
            <fieldset>
              <label class="form-label">Название товара</label>
              <input id="title" required="" type="text" name="title" class="form-control" placeholder="Название товара">
            </fieldset>
          </div>
          <div class="form-group form-group__wide">
            <label class="form-label">Описание</label>
            <textarea id="description" required="" class="form-control" name="description" data-element="productDescription" placeholder="Описание товара"></textarea>
          </div>
          <div class="form-group form-group__wide" data-element="sortable-list-container">
            <label class="form-label">Фото</label>
            <div id="images" data-element="imageListContainer">
            </div>
            <button type="button" name="uploadImage" class="button-primary-outline"><span>Загрузить</span></button>
          </div>
          <div class="form-group form-group__half_left">
            <label class="form-label">Категория</label>
            <select id="subcategory" class="form-control" name="subcategory"></select>
          </div>
          <div class="form-group form-group__half_left form-group__two-col">
            <fieldset>
              <label class="form-label">Цена ($)</label>
              <input id="price" required="" type="number" name="price" class="form-control" placeholder="100">
            </fieldset>
            <fieldset>
              <label class="form-label">Скидка ($)</label>
              <input id="discount" required="" type="number" name="discount" class="form-control" placeholder="0">
            </fieldset>
          </div>
          <div class="form-group form-group__part-half">
            <label class="form-label">Количество</label>
            <input id="quantity" required="" type="number" class="form-control" name="quantity" placeholder="1">
          </div>
          <div class="form-group form-group__part-half">
            <label class="form-label">Статус</label>
            <select id="status" class="form-control" name="status">
              <option value="1">Активен</option>
              <option value="0">Неактивен</option>
            </select>
          </div>
          <div class="form-buttons">
            <button type="submit" name="save" class="button-primary-outline">
              Сохранить товар
            </button>
          </div>
        </form>
      </div>
    `
  }

  getSubElements() {
    const result = {};
    const elements = this.element.querySelectorAll("[data-element]");

    for (const subElement of elements) {
      const name = subElement.dataset.element;
      result[name] = subElement;
    }
    return result;
  }

  getProduct() {
    const url = new URL(BACKEND_URL);
    url.pathname = '/api/rest/products';
    url.searchParams.set('id', this.productId);
    const product = (this.productId) ? this.LoadData(url) : Promise.resolve(this.defaultFormData); 
    return product
    
  }

  getCategories() {
    const url = new URL(BACKEND_URL);
    url.pathname = '/api/rest/categories';
    url.searchParams.set('_sort','weight');
    url.searchParams.set('_refs','subcategory');
    return this.LoadData(url); ;
  }

  LoadData(url) {
    const data = fetchJson(url);
    return data;
  }

  async save() {
    const product = this.takeProduct();
    const url  = new URL(BACKEND_URL);
    url.pathname = '/api/rest/products';
    
    try {
      const result = await fetchJson(url, {
      method: this.productId ? 'PATCH' : 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(product)
    });

    this.dispatchEvent(result.id);
    } catch (error) {
      console.error('Ошибка сохранения', error);
    }
  }

  takeProduct() {
    const product = {...this.defaultFormData};
    const fields = Object.entries(product);
    fields.forEach(item => {
        const [field, value] = item;
        const elem = this.subElements.productForm.querySelector(`#${field}`);
        if (elem) {
          if (field !== 'images') {
            product[field] = Number.isFinite(value) ? Number(elem.value) : elem.value;
          } else {
            const items = elem.querySelectorAll('li');
            items.forEach( item => {
              const url = item.querySelector('[name="url"]').value;
              const source = item.querySelector('[name="source"]').value;
              value.push({ url, source });
            }
            )
            product[field] = value;
          }
        }
      })
    product.id = this.productId;  
    return product
  }

  dispatchEvent (id) {
    const event = new CustomEvent(
      (this.productId) ? 'product-updated' : 'product-saved',
      { detail: id }
    )

    this.element.dispatchEvent(event);
  }

  remove() {
    if (this.element) {
      this.element.remove();
    }
  }

  destroy() {
    this.remove();
  }
}
