// Apply same technique in product.js
let origList = []

// Global variables
const bsSwitch = {'b': true}
const obj = {'isAscend': true}
let priceTog = [0]
let avTog = [0]
let sizeTog = [0]

window.onload = function () {
    const parser = new DOMParser();
    const descArr = document.getElementsByClassName('productbox-desc');

    for (let i = 0; i < descArr.length; i++) {
        let toParse = descArr[i].innerText;
        let doc = parser.parseFromString(toParse, 'text/html');

        let newP = document.createElement('p');
        newP.innerHTML = doc.body.innerHTML;

        descArr[i].replaceChildren();

        descArr[i].appendChild(newP);
    }

    const fIcon = document.getElementById('filter-icon');
    
    // TODO: When out of view, collapse the box
    fIcon.addEventListener("click", (e) => {
        
        const box = document.querySelector("#sort-box")

        console.log(box.style.visibility == 'hidden')
        if (box.style.visibility == 'hidden'){
            box.setAttribute('style', 'visibility: visibile');
        }
        else{
            box.setAttribute('style', 'visibility: hidden')
        }

    })

    d = document.getElementsByClassName("productbox");

    for (let i = 0; i< d.length; i++){
        origList.push(d[i])
    }


}


function replaceMainProductChildren(toReplace){

    let mainProduct = document.getElementById('productlist-main');

    mainProduct.replaceChildren();

    console.log(toReplace)

    for(let i = 0 ; i < toReplace.length; i++){
        mainProduct.appendChild(toReplace[i])
    }
}

// Reset everytime one of the filter's been pressed
function sortAlphabeticalReset(){
    obj.isAscend = true
    var sortBtn = document.getElementById('sort-alphabetically');
    sortBtn.innerText = 'A-Z'

    sortBtn.classList.remove('focused');
}

function filterButtonReset(key) {
    const fbtn = document.getElementsByClassName("filter");
    for (let i = 0; i < fbtn.length; i++) {
        fbtn[i].classList.remove("focused");
    }
}


function sortAlphabetical() {
    const rows = document.querySelectorAll(".product-table tbody tr");
    const btn = document.getElementById("sort-alphabetically");
    const arr = Array.from(rows);

    filterButtonReset("a");

    if (obj.isAscend) {
        arr.sort((a, b) => {
            const aName = a.querySelector("input[name='productName']").value.toLowerCase();
            const bName = b.querySelector("input[name='productName']").value.toLowerCase();
            return aName.localeCompare(bName);
        });
        obj.isAscend = false;
        btn.innerText = "Z-A";
    } else {
        arr.sort((a, b) => {
            const aName = a.querySelector("input[name='productName']").value.toLowerCase();
            const bName = b.querySelector("input[name='productName']").value.toLowerCase();
            return bName.localeCompare(aName);
        });
        obj.isAscend = true;
        btn.innerText = "A-Z";
    }

    btn.classList.add("focused");

    const tbody = document.querySelector(".product-table tbody");
    tbody.innerHTML = "";
    arr.forEach(row => tbody.appendChild(row));
}



function availability() {
    const rows = document.querySelectorAll(".product-table tbody tr");
    const btn = document.getElementById("av");
    const arr = Array.from(rows);

    sortAlphabeticalReset();
    filterButtonReset("av");

    if (avTog[0] === 0) {
        arr.sort((a, b) => {
            const aq = parseInt(a.querySelector("input[name='quantity']").value || 0);
            const bq = parseInt(b.querySelector("input[name='quantity']").value || 0);
            return bq - aq; // Sort descending
        });

        avTog[0] += 1;
        btn.classList.add("focused");
    } else {
        arr.sort((a, b) => {
            const aName = a.querySelector("input[name='productName']").value.toLowerCase();
            const bName = b.querySelector("input[name='productName']").value.toLowerCase();
            return aName.localeCompare(bName);
        });

        avTog[0] = 0;
        btn.classList.remove("focused");
    }

    const tbody = document.querySelector(".product-table tbody");
    tbody.innerHTML = "";
    arr.forEach(row => tbody.appendChild(row));
}


function size(){
    var productBox = document.getElementsByClassName('productbox');
    var btn = document.getElementById('s');
    var sArr = []

    sortAlphabeticalReset()
    filterButtonReset('s')


    for (let i = 0; i < productBox.length; i++){
        sArr.push(productBox[i])
    }


    if (sizeTog[0] == 0){

        sArr.sort((a,b) => {
            one = Number(a.querySelector("#lsize").value)
            two = Number(b.querySelector("#lsize").value)

            return two-one
        })

        sizeTog[0] += 1
        btn.classList.add('focused');
    }
    else if (sizeTog[0] == 1){

        sArr.sort((a,b) => {
            one = Number(a.querySelector("#lsize").value)
            two = Number(b.querySelector("#lsize").value)

            return two-one
        })

        sArr.reverse()

        sizeTog[0] += 1
    }

    else{
        sArr = origList
        sizeTog[0] = 0
        btn.classList.remove('focused')
    }


    replaceMainProductChildren(sArr)



}

function submitInlineProductEdit(id) {
    const row = document.getElementById(`row-${id}`);
    const form = row.querySelector("form");
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    fetch(`/update-product/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(async res => {
        if (res.ok) {
            location.reload(); // or just update the row visually if you prefer
        } else {
            const result = await res.json();
            alert("Failed to save: " + (result.error || "Unknown error"));
        }
    })
    .catch(err => {
        console.error(err);
        alert("Something went wrong.");
    });
}

function enableEditMode(id) {
    const row = document.getElementById(`row-${id}`);
    const inputs = row.querySelectorAll('.edit-mode');
    const views = row.querySelectorAll('.view-mode');
    const editButton = row.querySelector('.edit-button');

    views.forEach(el => el.style.display = 'none');
    editButton.style.display = 'none';
    inputs.forEach(el => el.style.display = 'inline-block');
}

document.getElementById("search-bar").addEventListener("input", function () {
    const query = this.value.toLowerCase();
    const rows = document.querySelectorAll(".product-table tbody tr");

    rows.forEach(row => {
        const name = row.querySelector("input[name='productName']").value.toLowerCase();
        const desc = row.querySelector("textarea[name='productDescription']").value.toLowerCase();

        if (name.includes(query) || desc.includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
});

let deleteModeActive = false;

function toggleDeleteMode() {
    deleteModeActive = !deleteModeActive;

    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(btn => {
        btn.style.display = deleteModeActive ? 'inline-block' : 'none';
    });
}

function deleteProduct(productId) {
    if (confirm("Are you sure you want to delete this product?")) {
        fetch(`/deleteproduct/${productId}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (res.ok) {
                location.reload(); // Refresh the page to reflect deletion
            } else {
                alert("Failed to delete product.");
            }
        })
        .catch(err => {
            console.error("Error deleting product:", err);
            alert("Error occurred.");
        });
    }
}



