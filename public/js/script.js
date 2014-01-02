// Load all her at one time
(function ($) {
	$(function () {
		$.ajax({
			url: "/allher",
			dataType:"JSON",
			success: function (status, data) {
				window.hers = data;
			}
		});
	});
})(jQuery);

