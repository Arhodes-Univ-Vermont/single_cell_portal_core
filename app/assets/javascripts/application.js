// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery2
//= require jquery_ujs
//= require ckeditor/init
//= require dataTables/jquery.dataTables
//= require dataTables/bootstrap/3/jquery.dataTables.bootstrap
//= require jquery.bootstrap.wizard
//= require jquery-fileupload
//= require jquery-fileupload/basic-plus
//= require jquery_nested_form
//= require spin.min
//= require jquery-ui/core
//= require jquery-ui/widgets/datepicker
//= require jquery-ui/widgets/autocomplete
//= require jquery-ui/widgets/sortable
//= require jquery-ui/widgets/dialog
//= require jquery-ui/effects/effect-highlight
//= require bootstrap-sprockets
//= require jquery.actual.min
//= require autocomplete-rails
//= require bootstrap-select.min
//= require canvas2svg
//= require canvg
//= require colorbrewer
//= require d3.min
//= require FileSaver.min
//= require hammer.min
//= require jquery.event.drag-2.2
//= require jquery.mousewheel.min
//= require newick
//= require papaparse.min
//= require parser
//= require rgbcolor
//= require slick.min
//= require StackBlur
//= require tsne
//= require underscore-min
//= require xlsx.full.min
//= require morpheus-latest.min
//= require kernel-functions
//= require simple-statistics.min
//= require sheather_jones
//= require jquery.stickyPanel
//= require clipboard.min

var fileUploading = false;
var PAGE_RENDERED = false;
var OPEN_MODAL = '';
var CLUSTER_TYPE = '3d';

$(document).on('shown.bs.modal', function(e) {
    console.log("modal " + $(e.target).attr('id') + ' opened');
    OPEN_MODAL = $(e.target).attr('id');
});

$(document).on('hidden.bs.modal', function(e) {
    console.log("modal " + $(e.target).attr('id') + ' closed');
    OPEN_MODAL = '';
});

// Toggle sidebar, e.g. for "View Options" menu in Explore tab
$(document).on('click', '[data-toggle="offcanvas"]', function () {
  console.log('clicked "offcanvas" toggler')

  // Expand View Options menu
  $('.row-offcanvas').toggleClass('active');

  // Contract main content area to make room View Options menu
  $('.row-offcanvas > .nav-tabs, .row-offcanvas > .tab-content')
    .toggleClass('contracted-for-sidebar');

  // Re-render Plotly to use available space
  $(window).trigger('resize');

});

function setTabNavLeftMargin() {
  var tabNavLeft,
    viewOptionsIsOpen = $('#render-target > .row-offcanvas').hasClass('active'),
    searchPanelIsVisible = $('#search-parent').is(':visible');

  if (viewOptionsIsOpen) {
    if (searchPanelIsVisible) {
      tabNavLeft = '0px';
    } else {
      tabNavLeft = '22%';
    }
  } else {
    if (searchPanelIsVisible) {
      tabNavLeft = '0px';
    } else {
      tabNavLeft = '13px';
    }
  }
  $('#plots-tab-nav').css('margin-left', tabNavLeft);
}

// Prevent scroll upon clicking View Options link
$(document).on('click', '#view-option-link', function(e) {
  e.preventDefault();
  setTabNavLeftMargin();
});


// Toggles search panel upon clicking burger menu to left of "Search genes"
$(document).on('click', '#search-omnibar-menu i', function(e) {

  var searchParent = $('#search-parent'),
      tabNavLeft;

  if (searchParent.is(':visible')) {
    // Search options panel is open, so close it.
    searchParent.hide();
    $('#render-target').addClass('col-md-13').removeClass('col-md-10');
    setTabNavLeftMargin();
    $(this).removeClass('open');
  } else {
    // Search options panel is closed, so open it.
    searchParent.show();
    $('#render-target').removeClass('col-md-13').addClass('col-md-10');
    setTabNavLeftMargin();
    $(this).addClass('open');
  }

});

$('#search_genes').focus();

jQuery.railsAutocomplete.options.noMatchesLabel = "No matches in this study";

// used for calculating size of plotly graphs to maintain square aspect ratio
var SCATTER_RATIO = 0.75;

function elementVisible(element) {
    return $(element).is(":visible");
}

function paginateStudies(totalPages, order, searchString) {

    var paginationOpts = {
        lines: 11, // The number of lines to draw
        length: 15, // The length of each line
        width: 5, // The line thickness
        radius: 10, // The radius of the inner circle
        scale: 1, // Scales overall size of the spinner
        corners: 1, // Corner roundness (0..1)
        color: '#000', // #rgb or #rrggbb or array of colors
        opacity: 0.25, // Opacity of the lines
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        speed: 1, // Rounds per second
        trail: 60, // Afterglow percentage
        fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        className: 'spinner', // The CSS class to assign to the spinner
        top: '12px',  // Top position relative to parent
        left: '50%',  // Left position relative to parent
        shadow: false, // Whether to render a shadow
        hwaccel: false, // Whether to use hardware acceleration
        position: 'relative' // Element positioning
    };

    var target = document.getElementById("pagination");
    var spinner = new Spinner(paginationOpts).spin(target);
    var page = parseInt($($(".study-panel").slice(-1)[0]).attr("data-page")) + 1;
    var dataParams = {};
    dataParams["page"] = page;
    if (order != "") {
        dataParams["order"] = order;
    }
    if (searchString != "") {
        dataParams["search_terms"] = searchString;
    }
    $("#pagination").fadeOut("fast", function() {
            $.ajax({
                url: "/single_cell",
                data: dataParams,
                dataType: "script",
                type: "GET",
                success: function(data){
                    spinner.stop();
                    $(".glyphicon").tooltip();
                    if ( dataParams["page"] != totalPages ) {
                        $("#pagination").fadeIn("fast");
                        $(window).bind('scroll', bindScroll);
                    }
                }
            });
        }
    );
}


// used for keeping track of position in wizard
var completed = {
    initialize_expression_form_nav: false,
    initialize_metadata_form_nav: false,
    initialize_ordinations_form_nav: false,
    initialize_labels_form_nav: false,
    initialize_marker_genes_form_nav: false,
    initialize_primary_data_form_nav: false,
    initialize_misc_form_nav: false
};

function completeWizardStep(step) {
    completed[step] = true;
    return completed;
}

function resetWizardStep(step) {
    completed[step] = false;
    $('#' + step + '_completed').html("");
    setWizardProgress(getWizardStatus());
    return completed;
}

// get current status of upload/initializer wizard
function getWizardStatus() {
    var done = 0;
    for (var step in completed) {
        if (completed[step] === true) {
            done++;
        }
    }
    return done;
}

function setWizardProgress(stepsDone) {
    var steps = parseInt(stepsDone);
    var totalSteps = $('li.wizard-nav').length;
    var totalCompletion = Math.round((steps/totalSteps) * 100);
    $('#bar').find('.progress-bar').css({width:totalCompletion+'%'});
    $('#progress-count').html(totalCompletion+'% Completed');
}

function showSkipWarning(step) {
    if (['initialize_ordinations_form_nav', 'initialize_metadata_form_nav', 'initialize_expression_form_nav'].indexOf(step) >= 0) {
        return (!completed.initialize_ordinations_form_nav || !completed.initialize_metadata_form_nav || !completed.initialize_expression_form_nav)
    } else {
        return false;
    }
}

// toggle chevron glyphs on clicks
function toggleGlyph(el) {
    el.toggleClass('fa-chevron-right fa-chevron-down');
}

// function to delegate delete call for a file after showing confirmation dialog
function deletePromise(event, message) {
    new Promise(function (resolve) {
        var conf = confirm(message);
        if ( conf === true ) {
            launchModalSpinner('#delete-modal-spinner','#delete-modal', function() {
                return resolve(true);
            });
        } else {
            return resolve(false);
        }
    }).then(function (answer) {
        if (answer !== true) {
            event.stopPropagation();
            event.preventDefault();
        }
        return answer;
    });
}

// attach various handlers to bootstrap items and turn on functionality
function enableDefaultActions() {
    // need to clear previous listener to prevent conflict
    $('.panel-collapse').off('show.bs.collapse hide.bs.collapse');

    $('.panel-collapse').on('show.bs.collapse hide.bs.collapse', function () {
        toggleGlyph($(this).prev().find('span.toggle-glyph'));
    });

    $('.datepicker').datepicker({dateFormat: 'yy-mm-dd'});

    $('body').tooltip({selector: '[data-toggle="tooltip"]', container: 'body', trigger: 'hover'});
    $('[data-toggle="popover"]').popover();

    // warns user of in progress uploads, fileUploading is set to true from fileupload().add()
    $('.check-upload').click(function () {
        if (fileUploading) {
            if (confirm("You still have file uploads in progress - leaving the page will cancel any incomplete uploads.  " +
                    "Click 'OK' to leave or 'Cancel' to stay.  You may open another tab to continue browsing if you wish.")) {
                return true;
            } else {
                return false;
            }
        }
    });

    // handler for file deletion clicks, need to grab return value and pass to window
    $('body').on('click', '.delete-file', function (event) {
        deletePromise(event, 'Are you sure?  This file will be deleted and any associated database records removed.  This cannot be undone.');
    });

    // handler for file unsync clicks, need to grab return value and pass to window
    $('body').on('click', '.delete-file-sync', function (event) {
        deletePromise(event, 'Are you sure?  This will remove any database records associated with this file.  This cannot be undone.');
    });

    // disable mousewheel on a input number field when in focus
    // (to prevent Cromium browsers change the value when scrolling)
    $('form').on('focus', 'input[type=number]', function (e) {
        $(this).on('mousewheel.disableScroll', function (e) {
            e.preventDefault()
        });
    });

    $('form').on('blur', 'input[type=number]', function (e) {
        $(this).off('mousewheel.disableScroll')
    });

    // when clicking the main study view page tabs, update the current URL so that when you refresh the tab stays open
    $('#study-tabs').on('shown.bs.tab', function(event) {
        var anchor = $(event.target).attr('href');
        var currentUrl = window.location.href;
        var urlParts = currentUrl.split('#');
        var newUrl = '';
        if (urlParts.length === 1) {
            newUrl = currentUrl + anchor;
        } else if (urlParts[1] === '') {
            newUrl = currentUrl.replace(/#/, '') + anchor;
        } else {
            var currentTab = urlParts[1];
            // we need to replace the current tab with the new one in the anchor/parameter string
            replaceRegex = new RegExp('#' + currentTab);
            newUrl = currentUrl.replace(replaceRegex, anchor);
        }
        // use HTML5 history API to update the url without reloading the DOM
        history.pushState('', document.title, newUrl);
    });
}

var stickyOptions = {
    topPadding: 85
};
// toggle the Search/View options panel
function toggleSearch() {
    $('#search-target').toggleClass('col-md-3 hidden');
    $('#render-target').toggleClass('col-md-9 col-md-12');
    $('#search-options-panel').toggleClass('hidden');
    $('#show-search-options').toggleClass('hidden');
    if ( $('#show-search-options').css('display') === 'none' ) {
        $('#show-search-options').tooltip('hide');
    }

    // trigger resizeEnd to re-render Plotly to use available space
    $(window).trigger('resize');
    if ($('#panel-selection').is(':visible')) {
        if ($('#search-target').is(":visible")) {
            $('#search-parent').stickyPanel(stickyOptions)
        } else {
            if ($('#search-parent').data("stickyPanel.state") !== 'undefined') {
                $('#search-parent').stickyPanel('unstick')
            }
        }
    }
}

// options for Spin.js
var opts = {
    lines: 13, // The number of lines to draw
    length: 56, // The length of each line
    width: 14, // The line thickness
    radius: 42, // The radius of the inner circle
    scale: 1, // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color: '#000', // #rgb or #rrggbb or array of colors
    opacity: 0.25, // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    className: 'spinner', // The CSS class to assign to the spinner
    top: '50%', // Top position relative to parent
    left: '50%', // Left position relative to parent
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    position: 'absolute' // Element positioning
};

var smallOpts = {
    lines: 11, // The number of lines to draw
    length: 9, // The length of each line
    width: 3, // The line thickness
    radius: 4, // The radius of the inner circle
    scale: 1,  // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color: '#000',  // #rgb or #rrggbb or array of colors
    opacity: 0.25,  // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20,  // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9,  // The z-index (defaults to 2000000000)
    className: 'spinner',  // The CSS class to assign to the spinner
    top: '7px',  // Top position relative to parent
    left: '50%',  // Left position relative to parent
    shadow: false,  // Whether to render a shadow
    hwaccel: false,  // Whether to use hardware acceleration
    position: 'relative' // Element positioning
};

// functions to show loading modals with spinners
// callback function will execute after modal completes opening
function launchModalSpinner(spinnerTarget, modalTarget, callback) {
    // set listener to fire callback, and immediately clear listener to prevent multiple requests queueing
    $(modalTarget).on('shown.bs.modal', function() {
        $(modalTarget).off('shown.bs.modal');
        callback();
    });

    $(spinnerTarget).empty();
    var target = $(spinnerTarget)[0];
    var spinner = new Spinner(opts).spin(target);
    $(target).data('spinner', spinner);
    $(modalTarget).modal('show');
};

// function to close modals with spinners launched from launchModalSpinner
// callback function will execute after modal completes closing
function closeModalSpinner(spinnerTarget, modalTarget, callback) {
    // set listener to fire callback, and immediately clear listener to prevent multiple requests queueing
    $(modalTarget).on('hidden.bs.modal', function() {
        $(modalTarget).off('hidden.bs.modal');
        callback();
    });
    $(spinnerTarget).data('spinner').stop();
    $(modalTarget).modal('hide');
}

// Propagate changes from the View Options sidebar to the Search Genes form.
function updateSearchGeneParams() {

  // Get values from control elements in View Options sidebar
  var cluster = $('#cluster').val();
  var annotation = $('#annotation').val();
  var consensus = $('#search_consensus').val();
  var subsample = $('#subsample').val();
  var plot_type = $('#plot_type').val() === undefined ? 'violin' : $('#plot_type').val();
  var kernel_type = $('#kernel_type').val() === undefined ? 'gau' : $('#kernel_type').val();
  var band_type = $('#band_type').val() === undefined ? 'nrd0' : $('#band_type').val();
  var boxpoints = $('#boxpoints_select').val() === undefined ? 'all' : $('#boxpoints_select').val();
  var heatmap_size = $('#heatmap');
  var heatmap_row_centering = $('#heatmap_row_centering').val();
  var heatmap_size = parseInt($('#heatmap_size').val());

  // These 'search_foo' values exist in hidden form elements in '#search-genes-input'
  $("#search_cluster").val(cluster);
  $("#search_annotation").val(''); // clear value first
  $("#search_annotation").val(annotation);
  $('#search_plot_type').val(plot_type);
  $('#search_kernel_type').val(kernel_type);
  $('#search_band_type').val(band_type);
  $('#search_boxpoints').val(boxpoints);
  $('#search_heatmap_row_centering').val(heatmap_row_centering);
  $('#search_heatmap_size').val(heatmap_size);
}


// Gets URL parameters needed for each "render" call, e.g. no-gene, single-gene, multi-gene
function getRenderUrlParams() {

  // Get values from control elements in View Options sidebar
  var cluster = $('#cluster').val();
  var annotation = $('#annotation').val();
  var consensus = $('#search_consensus').val();
  var subsample = $('#subsample').val();
  var plot_type = $('#plot_type').val() === undefined ? 'violin' : $('#plot_type').val();
  var kernel_type = $('#kernel_type').val() === undefined ? 'gau' : $('#kernel_type').val();
  var band_type = $('#band_type').val() === undefined ? 'nrd0' : $('#band_type').val();
  var boxpoints = $('#boxpoints_select').val() === undefined ? 'all' : $('#boxpoints_select').val();
  var heatmap_row_centering = $('#heatmap_row_centering').val();
  var heatmap_size = parseInt($('#heatmap_size').val());

  var urlParams =
    'cluster=' + cluster +
    '&annotation=' + annotation +
    '&boxpoints=' + boxpoints +
    '&consensus=' + consensus +
    '&subsample=' + subsample +
    '&plot_type=' + plot_type +
    '&kernel_type=' + kernel_type +
    '&band_type=' + band_type +
    '&heatmap_row_centering=' + heatmap_row_centering +
    '&heatmap_size=' + heatmap_size;

  return urlParams;
}

// Handle changes in View Options for 'Distribution' view
$(document).on('change', '#plot_type, #kernel_type, #band_type', function() {
  $('#expression-plots').data('box-rendered', false);
  $('#expression-plots').data('scatter-rendered', false);
  $('#expression-plots').data('reference-rendered', false);

  updateSearchGeneParams();

  if (typeof renderGeneExpressionPlots !== 'undefined' && /numeric/.test($('#annotation').val()) === false) {
    // Accounts for changing View Options when not in Distribution view,
    // but does not apply if we're looking at an annotation like "Intensity" or "Average intensity".
    renderGeneExpressionPlots();
  }
});

// Handles changes in View Options for 'Heatmap' view
$(document).on('change', '#heatmap_row_centering, #annotation', function() {
  updateSearchGeneParams();
});
$(document).on('click', '#resize-heatmap', function() {
  updateSearchGeneParams();
});

// default title font settings for axis titles in plotly
var plotlyTitleFont = {
    family: 'Helvetica Neue',
    size: 16,
    color: '#333'
};

// default label font settings for colorbar titles in plotly
var plotlyLabelFont = {
    family: 'Helvetica Neue',
    size: 12,
    color: '#333'
};

var plotlyDefaultLineColor = 'rgb(40, 40, 40)';

// default scatter plot colors, a combination of colorbrewer sets 1-3 with tweaks to the yellow members
var colorBrewerSet = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#a65628", "#f781bf", "#999999",
    "#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3", "#8dd3c7",
    "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"];

// clear out text area in a form
function clearForm(target) {
    $('#' + target).val("");
}

// set error state on blank text boxes or selects
function setErrorOnBlank(selector) {
    selector.map(function() {
        if ( $(this).val() === "" ) {
            $(this).parent().addClass('has-error has-feedback');
        } else {
            $(this).parent().removeClass('has-error has-feedback');
        }
    });
}

// custom event to trigger resize event only after user has stopped resizing the window
$(window).resize(function() {
    if(this.resizeTO) clearTimeout(this.resizeTO);
    this.resizeTO = setTimeout(function() {
        $(this).trigger('resizeEnd');
        console.log('resizeEnd');
    }, 100);
});

// generic function to render Morpheus
function renderMorpheus(dataPath, annotPath, selectedAnnot, selectedAnnotType, target, annotations, fitType, heatmapHeight, colorScaleMode) {
    console.log('render status of ' + target + ' at start: ' + $(target).data('rendered'));
    $(target).empty();
    console.log("scaling mode: " + colorScaleMode);
    var config = {dataset: dataPath, el: $(target), menu: null, colorScheme: {scalingMode: colorScaleMode}};

    // set height if specified, otherwise use default setting of 500 px
    if (heatmapHeight !== undefined) {
        config.height = heatmapHeight;
    } else {
        config.height = 500;
    }

    // fit rows, columns, or both to screen
    if (fitType === 'cols') {
        config.columnSize = 'fit';
    } else if (fitType === 'rows') {
        config.rowSize = 'fit';
    } else if (fitType === 'both') {
        config.columnSize = 'fit';
        config.rowSize = 'fit';
    } else {
        config.columnSize = null;
        config.rowSize = null;
    }

    // load annotations if specified
    if (annotPath !== '') {
        config.columnAnnotations = [{
            file : annotPath,
            datasetField : 'id',
            fileField : 'NAME',
            include: [selectedAnnot]}
        ];
        config.columnSortBy = [
            {field: selectedAnnot, order:0}
        ];
        config.columns = [
            {field:'id', display:'text'},
            {field: selectedAnnot, display: selectedAnnotType === 'group' ? 'color' : 'bar'}
        ];
        // create mapping of selected annotations to colorBrewer colors
        var annotColorModel = {};
        annotColorModel[selectedAnnot] = {};
        var sortedAnnots = annotations['values'].sort();

        // calling % 27 will always return to the beginning of colorBrewerSet once we use all 27 values
        $(sortedAnnots).each(function(index, annot) {
            annotColorModel[selectedAnnot][annot] = colorBrewerSet[index % 27];
        });
        config.columnColorModel = annotColorModel;
    }

    // instantiate heatmap and embed in DOM element
    var heatmap = new morpheus.HeatMap(config);

    // set render variable to true for tests
    $(target).data('morpheus', heatmap);
    $(target).data('rendered', true);
    console.log('render status of ' + target + ' at end: ' + $(target).data('rendered'));

}

// toggles visibility and disabled status of file upload and fastq url fields
function toggleFastqFields(target) {
    var selector = $("#" + target);
    var fileField = selector.find('.upload-field');
    $(fileField).toggleClass('hidden');
    var fastqField = selector.find('.fastq-field');
    $(fastqField).toggleClass('hidden');
    // toggle disabled status by returning inverse of current state
    $(fastqField).find('input').attr('disabled', !$(fastqField).find('input').is('[disabled=disabled]'));
    // set human data attr to true
    var humanData = $(fastqField).find('input[type=hidden]');
    $(humanData).val($(humanData).val() === 'true' ? 'false' : 'true' );
    // enable name field & update button to allow saving
    var saveBtn = selector.find('.save-study-file');
    $(saveBtn).attr('disabled', !$(saveBtn).is('[disabled=disabled]'));
    var nameField = selector.find('.filename');
    $(nameField).attr('readonly', !$(nameField).is('[readonly=readonly]'));
    $(nameField).attr('placeholder', '');
    // animate highlight effect to show fields that need changing
    $(nameField).parent().effect('highlight', 1200);
    $(fastqField).effect('highlight', 1200);
}

// function to toggle all traces in a Plotly div
function togglePlotlyTraces(div) {
    console.log('toggling all traces in ' + div);
    var plotlyData = document.getElementById(div).data;
    var visibility = plotlyData[0].visible;

    // if visibility is undefined or true, that means it is visible and we want to set this to 'legendonly'
    // when visibility === 'legendonly', we can set this back to true to show all traces
    if( visibility === undefined || visibility === true) {
        visibility = 'legendonly';
    } else {
        visibility = true
    }

    Plotly.restyle(div, 'visible', visibility);
    // toggle class of toggle glyph
    $('#toggle-traces').children().toggleClass('fa-toggle-on fa-toggle-off');
    console.log('toggle complete in ' + div + '; visibility now ' + visibility);
}


// function to return a plotly histogram data object from an array of input values
function formatPlotlyHistogramData(valuesHash, offset) {
    var dataArray = [];
    var i = offset;
    if (i === undefined) {
        i = 0;
    }
    $.each(valuesHash, function(keyName, distData) {
        var trace = {
            x: distData,
            type: 'histogram',
            name: keyName,
            histnorm: '',
            autobinx: false,
            xbins: {
                start: Math.min.apply(Math, distData) - 0.5,
                end: Math.max.apply(Math, distData) + 0.5,
                size: 1
            },
            marker: {
                color: colorBrewerSet[i]
            }
        };
        dataArray.push(trace);
        i++;
    });
    return dataArray;
}

// load column totals for bar charts
function loadBarChartAnnotations(plotlyData) {
    var annotationsArray = [];
    for (var i = 0; i < plotlyData[0]['x'].length ; i++){
        var total = 0;
        plotlyData.map(function(el) {
            var c = parseInt(el['y'][i]);
            if (isNaN(c)) {
                c = 0;
            }
            total += c;
        });
        var annot = {
            x: plotlyData[0]['x'][i],
            y: total,
            text: total,
            xanchor: 'center',
            yanchor: 'bottom',
            showarrow: false,
            font: {
                size: 12
            }
        };
        annotationsArray.push(annot);
    }
    return annotationsArray;
}

// load column totals for scatter charts
function loadScatterAnnotations(plotlyData) {
    var annotationsArray = [];
    var max = 0;
    $(plotlyData).each(function(index, trace) {
        $(trace['y']).each(function(i, el) {
            if (el > max) {max = el};
            var annot = {
                xref: 'x',
                yref: 'y',
                x: plotlyData[index]['x'][i],
                y: el,
                text: el,
                showarrow: false,
                font: {
                    size: 12
                }
            };
            annotationsArray.push(annot);
        });
    });
    // calculate offset at 5% of maximum value
    offset = max * 0.05;
    $(annotationsArray).each(function(index, annotation) {
        // push up each annotation by offset value
        annotation['y'] += offset;
    });
    return annotationsArray;
}

// load bin counts for histogram charts
function loadHistogramAnnotations(plotlyData) {
    var annotationsArray = [];
    var counts = plotlyData[0]['x'];
    $(counts).each(function(i, c) {
        var count = counts.filter(function(a){return (a === c)}).length;
        var annot = {
            x: c,
            y: count,
            text: count,
            xanchor: 'center',
            yanchor: 'bottom',
            showarrow: false,
            font: {
                size: 12
            }
        };
        annotationsArray.push(annot);
    });

    return annotationsArray;
}

// validate uniquity of entries for various kinds of forms
function validateUnique(formId, textFieldClass) {
    $(formId).find(textFieldClass).change(function() {
        var textField = $(this);
        var newName = textField.val().trim();
        var names = [];
        $(textFieldClass).each(function(index, name) {
            var n = $(name).val().trim();
            if (n !== '') {
                names.push(n);
            }
        });
        // check if there is more than one instance of the new name, this will mean it is a dupe
        if (names.filter(function(n) {return n === newName}).length > 1) {
            alert(newName + ' has already been used.  Please provide a different name.');
            textField.val('');
            textField.parent().addClass('has-error');
        } else {
            textField.parent().removeClass('has-error');
        }
    });
}

// function to call Google Analytics whenever AJAX call is made
// must be called manually from every AJAX success or js page render
function gaTracker(id){
    $.getScript('https://www.google-analytics.com/analytics.js'); // jQuery shortcut
    window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
    ga('create', id, 'auto');
    ga('send', 'pageview');
}

function gaTrack(path, title) {
    ga('set', { page: path, title: title });
    ga('send', 'pageview');
}

// decode an HTML-encoded string
function unescapeHTML(encodedStr) {
    return $("<div/>").html(encodedStr).text();
}

// close the user annotations panel if open when rendering clusters
function closeUserAnnotationsForm() {
    if ( $('#selection_div').attr('class') === '' ) {
        console.log('closing user annotations form');
        // menu is open, so empty forms and reset button state
        $('#selection_div').html('');
        $('#selection_div').toggleClass('collapse');
        $('#toggle-scatter').children().toggleClass('fa-toggle-on fa-toggle-off');
    }
}

// validate an email address
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}