$(document).ready(function(){

	search_form = document.getElementById("search-form")
	search_bar = document.getElementById("search-bar")
    search_icon = document.getElementById("search-icon")

	search_bar.addEventListener('keypress', function (e) {
		if (e.key === 'Enter') {
			
			search_form.action = "/product-list"
			search_form.submit()
			
		}
		
	});

	search_icon.addEventListener("click", function(){

		search_form.action = "/product-list"
		search_form.submit()

	})

});