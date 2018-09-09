function loadCss(href, check) {

	if(typeof(check) == 'undefined') check = true;

	var head = document.getElementsByTagName('head')[0];
	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = href;

	if(check) {
		var links = head.getElementsByTagName('link');
		for(var i = 0; i < links.length; i++) {
			if(links[i].href == link.href) return false;
		}
	}

	head.appendChild(link);
}
