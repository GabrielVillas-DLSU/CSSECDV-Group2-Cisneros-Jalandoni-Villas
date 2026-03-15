
// Parse the description box
window.onload = function () {
    const parser = new DOMParser();
    const descDiv = document.getElementById('product-desc');
    const toParse = descDiv.innerText;
    const doc = parser.parseFromString(toParse, 'text/html');

    const parsedDesc = document.createElement('p');
    parsedDesc.innerHTML = doc.body.innerHTML;

    descDiv.replaceChildren();

    descDiv.appendChild(parsedDesc);

    const infoDiv = document.getElementById('product-additional-desc');
    const toParseInfo = infoDiv.innerText;
    const docI = parser.parseFromString(toParseInfo, 'text/html');

    const parsedInfo = document.createElement('p');
    parsedInfo.innerHTML = docI.body.innerHTML;

    infoDiv.replaceChildren();
    infoDiv.appendChild(parsedInfo);

    const sizeButton = document.getElementsByClassName('size-button');

    // The largest size will always be chosen
    sizeButton[0].classList.add('btn-focus');

    for(let i = 0; i < sizeButton.length; i++){
        sizeButton[i].addEventListener("click", (e)=>{

            e.currentTarget.classList.add('btn-focus');
            for(let a = 0; a < sizeButton.length; a++){
                if (sizeButton[a] == e.currentTarget){
                    // Skip
                    continue
                }

                if(sizeButton[a].classList.contains('btn-focus')){
                    sizeButton[a].classList.remove('btn-focus');
                }
            }

        });
    }

    const sizePicture = document.getElementsByClassName('sizePicture');

    for(let i = 0; i < sizePicture.length; i++){
        sizePicture[i].addEventListener("click", (e) =>{
            let id = e.currentTarget.id;

            let getId;

            if(id.includes('L')){
                getId = 'large'
            }
            else if(id.includes('M')){
                getId = 'medium'
            }
            else{
                getId = 'small'
            }

            for(let a = 0; a < sizeButton.length; a++){
                if(sizeButton[a].id == getId){
                    sizeButton[a].classList.add('btn-focus')
                    continue
                }

                sizeButton[a].classList.remove('btn-focus');
            }
        })
    }

}


async function fetchProduct(id){
    var product;

    await fetch(`/get-product/${id}`)
    .then((response) => {return response.text()})
    .then((data) => {
        product = data;
    })
    .catch((error) => {
        console.error(error);
    })

    return JSON.parse(product);
}

async function changeProductSize(size, id) {
    // Change Image Size
    const newImageSrc = document.getElementById(size + "Picture");
    const focusPicture = document.getElementById('focusedPicture');
    focusPicture.setAttribute('src', newImageSrc.getAttribute('src'));

    let getSize;

    switch (size) {
        case 'L':
            getSize = 'Large';

            break;
        case 'M':
            getSize = 'Medium';

            break;
        case 'S':
            getSize = 'Small';

            break;
    }

    var retProduct = await fetchProduct(id)
    const priceBox = document.getElementById('price');
    priceBox.innerText = retProduct[0]['Product Price'][getSize];

    const storeButton = document.getElementById('store-button');
    if (retProduct[0]['URL'][getSize] == null){
        storeButton.replaceChildren()
        storeButton.setAttribute("style", "background-color: grey");
        storeButton.removeAttribute('href')
        let header = document.createElement('h1')
        header.innerText = "NOT AVAILABLE"
        storeButton.appendChild(header)
    }else{
        storeButton.replaceChildren()
        storeButton.removeAttribute("style");
        storeButton.setAttribute("href", "https://shopee.ph/" + retProduct[0]['URL'][getSize])
        let header = document.createElement('h1')
        header.innerHTML = "GO TO SHOPEE"
        storeButton.appendChild(header)
    }



}

async function changeProductSizeViaPic(size, id){
    // Note: If there are review pics. Do not include it

    const newImageSrc = document.getElementById(size);
    const focusPicture = document.getElementById('focusedPicture');
    focusPicture.setAttribute('src', newImageSrc.getAttribute('src'));

    let getSize;

    switch (size) {
        case 'LPicture':
            getSize = 'Large';

            break;
        case 'MPicture':
            getSize = 'Medium';

            break;
        case 'SPicture':
            getSize = 'Small';

            break;
    }

    var retProduct = await fetchProduct(id);
    const priceBox = document.getElementById('price');
    priceBox.innerText = retProduct[0]['Product Price'][getSize];

    const storeButton = document.getElementById('store-button');
    if (retProduct[0]['URL'][getSize] == null){
        storeButton.replaceChildren()
        storeButton.setAttribute("style", "background-color: grey");
        storeButton.removeAttribute('href')
        let header = document.createElement('h1')
        header.innerText = "NOT AVAILABLE"
        storeButton.appendChild(header)
    }else{
        storeButton.replaceChildren()
        storeButton.removeAttribute("style");
        storeButton.setAttribute("href", "https://shopee.ph/" + retProduct[0]['URL'][getSize])
        let header = document.createElement('h1')
        header.innerHTML = "GO TO SHOPEE"
        storeButton.appendChild(header)
    }

}

function changeToCustomerPic(index){
    const newImageSrc = document.getElementById('customer-' + index)
    const focusedPicture = document.getElementById('focusedPicture');
    focusedPicture.setAttribute('src', newImageSrc.getAttribute('src'))


}
