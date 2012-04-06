$.extend({
  constructDoc: function(d,facets){
    var node = $('<div />').attr({class: 'doc ' + d.data_source, id: 'doc-' + d.id}), nodeContent = '';
    nodeContent += (d.id_isbn)? '<img src="http://covers.openlibrary.org/b/isbn/' + d.id_isbn[0] + '-S.jpg" class="cover" />' : '';
    if(d.content_link){nodeContent += '<a target="_blank" href="' + d.content_link[0] + '">';}
    nodeContent += (d.title) ? $.ellipsisSubstr(d.title) : 'Untitled Work';
    if(d.content_link){nodeContent += '</a>';}
    nodeContent += '<span class="data_source">' + d.data_source + '</span>';
    facets[d.data_source] = (facets[d.data_source] == undefined) ? 1 : (facets[d.data_source] + 1);
    return node.append(nodeContent).data('doc',d);
  	},

	ellipsisSubstr: function(inString){
		var max = arguments[1] || 100, suffix = arguments[2] || '…'; 
		if(inString.length >= max){
			return inString.substr(0,max) + suffix;
			}
		else{return inString;}
		}
	});

$.fn.extend({
	xISBNjacketsLT: function(){
		return this.each(function(){
			$this = $(this);
			if($this.data('doc').id_isbn && !$this.data('retrievedLT')){
				$.getJSON('http://xisbn.worldcat.org/webservices/xid/isbn/' + $this.data('doc').id_isbn + '?method=getEditionsa&format=json&fl=*&callback=?')
					.done(function(data){
						if(data.list){
							var output = '<br /><strong><a target="_blank" href="http://www.librarything.com/isbn/' + isbn + '">LibraryThing</a> Jackets</strong>:<br />';
							$.each(data.list,function(i,record){
								if(i <= 10){
									output += '<img src="http://covers.librarything.com/devkey/67af2723f6491710c32b6d9b27bcaa0d/small/isbn/' + record.isbn[0] + '" alt="" />';
									}
								});
							$this.append(output)
							}
						});
				$this.data('retrievedLT',true);		
				}
		$this.find("img").each(function(){
			if(this.width == 1){
				$(this).remove();
				}
			});
		$('.isotope').isotope('reLayout');
		});
		},
	
	subjectFlickr: function(doc,subject){
		return this.each(function(){
			$this = $(this);
			if($this.data('doc').subject && !$this.data('retrievedFlickr')){
				var subject = $.trim($this.data('doc').subject[0].split(',')[0]), term = encodeURIComponent(subject);
				$.getJSON('http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=ea0707dc3f4b4b3346806560845986c9&license=1,2,3,4,5,6,7&sort=relevance&format=json&text=' + term + '&jsoncallback=?')
					.done(function(data){
						if(data.photos.photo){
							var output = '<br /><strong><a target="_blank" href="http://www.flickr.com/search/?l=deriv&q=' + term + '">Flickr results</a> for "' + subject + '"</strong>:<br />';
							$.each(data.photos.photo,function(i,photo){
								if(i <= 2){
									output += '<a href="http://www.flickr.com/photos/' + photo.owner + '/' + photo.id + '/"><img src="http://farm' + photo.farm + '.staticflickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_s.jpg" alt="" height="75" width="75" /></a>';
									}
								});
							$this.append(output);
							$('.isotope').isotope('reLayout');
							}
						});
					$this.data('retrievedFlickr',true);
					}
			});
		}
	});

$(document).ready(function(){
	$form = $("#query"); // form elements can all be traversed from here
	$target = $("#target"); // result area
	
	/* Page through results */
	$form.on('click','.paginate',function(){
		$('#start').val($(this).attr('data_pagination_start'));
		$form.submit();
		});
	
	/* Remove filters */
	$form.on('click','sup',function(){
		$(this).parent().remove();
  	});
  
  /* Add filter when toggle is clicked
   * Called by form submit as well
   */
	$('#add_searchable').on('click',function(){
		var $term = $form.find("#term").focus(), $searchable_select = $form.find('#searchable_select');
		if($term.val().length >= 1){
			$form.find('#terms').append('<span class="searchable_term" data_term_value="' + $term.val() + '" data_term_searchable="' +$searchable_select.val() + '"><span class="term_field">' + $searchable_select.val() + '</span>: ' + $term.val() + '<sup> X </sup>');
      $form[0].reset();
      $form.find('#start').val(0);
    	}
    return false;  
		});
	
	/* Limit results to the facets */
	$("#facets").on('click','.filter',function(){
    $target.isotope({filter: $(this).attr('data_filter_class')});
    });
	
	/* When form is submitted, get results */
  $form.on('submit',function(){
    $form.find("#add_searchable").click();
    $form.find('#submit').val('please wait…');
    $form.find('#meta').empty();
    $target.empty().isotope('destroy');
    $('#messages').empty();
    $('#facets').empty();
    
    var query = [];
			$('.searchable_term').each(function(){
				query.push({name: 'filter', value: $(this).attr('data_term_searchable') + ':' + $(this).attr('data_term_value')});
				});
    	if(query.length == 0){ // If there are no filters, don't do anything else
    		$('#messages').append('Please enter a query term and click "add term".');
    		return false;
    		}
    	query.push({name: "start", value: $form.find("#start").val()});

    $.getJSON('http://api.dp.la/dev/item?' + $.param(query) + '&callback=?')
    	.done(function(data){
    		$target.isotope({columnWidth: 300,itemSelector : '.doc',layoutMode : 'masonry'});
    		var facets = {};
        if(data.docs){
        	var start = +data.start, limit = +data.limit, num_found = +data.num_found, metaMsg = '';
        	$.each(data.docs,function(i,record){
    				$target.isotope('insert',$.constructDoc(record,facets));
    				});
    			$.each(facets,function(key,val){
          	$('#facets').append('<span class="filter" data_filter_class=".' + key + '">' + key + ' - ' + val + '</span>');
        		});
        	$('#facets').append('<span class="filter" data_filter_class="*">Show all</span>');
        	metaMsg += (start >= 1) ? '<span class="paginate" data_pagination_start="' + (start - limit) + '">&laquo; Previous</span>' : '';
        	metaMsg += (start + 1) + ' to ';
        	metaMsg += (num_found < (start + limit)) ? num_found : (start + limit);
        	metaMsg += ' of ' + num_found + ' found';
        	metaMsg += ((start + limit) < num_found) ? '<span class="paginate" data_pagination_start="' + (start + limit) + '">Next &raquo;</span>' : '';
        	$("#meta").append(metaMsg);
        	}
        else{
        	$('#messages').html('None found.');
        	}
    		})
    	.fail(function(){console.log("GLARING ERROR");})
    	.always(function(){
    		$('#submit').val('go!');
    		});
  	return false;
  	});
  
  /* Make AJAX calls to services when a result is clicked */
	$target.on('click','.doc',function(){
		$(this).xISBNjacketsLT().subjectFlickr();
		});
});
