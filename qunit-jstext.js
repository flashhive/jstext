/*

Copyright © 2012 by Samuel Rossille

*/
$(function() {

	module("$.jsText");

	var testMeasureFunction = function(functionName) {
		
		test(functionName + " - Empty text size", function() {
			var emptyTextMeasure = $.jsText[functionName]("", {});
			strictEqual(emptyTextMeasure.w, 0, "Empty text has no w");
		});
		test(functionName + " - Non empty text size", function() {
			var emptyTextMeasure = $.jsText[functionName]("Hello", {});
			ok(emptyTextMeasure.w > 0, "Non empty text has non zero w");
			ok(emptyTextMeasure.h > 0, "Non empty text has non zero height");
		});

		test(functionName + " - Text length growth", function() {
			var measure1 = $.jsText[functionName](".", {});
			var measure2 = $.jsText[functionName]("Hello.", {});
			ok(measure1.w < measure2.w, "Width grows strictly with text length");
			ok(measure1.h == measure2.h, "Height doesn't change with non empty text length");
		});

		test(functionName + " - Font size growth", function() {
			var measure1 = $.jsText[functionName]("Hello", {"font-size": "10px"});
			var measure2 = $.jsText[functionName]("Hello", {"font-size": "20px"});
			ok(measure1.w < measure2.w, "Widths grows strictly with font size");
		});
	};

	testMeasureFunction("computeTextMeasure");
	testMeasureFunction("getTextMeasure");
	
	test("splitWords", function() {
		deepEqual($.jsText.splitWords("  hello\r\n\r\n	my	 \n\n\n	world	\n"), ["hello", "my", "world"], "Correct split in a maximal complexity case");
	});
	
	test("flow behavior", function() {
		var flow = $.jsText.flow("Hello kqjsd jsdq sdjklqsjd qksjd qksdjqksjd qkjdqklsdjqklsdj qldj zzz", {});
		
		var layout = flow.layout({width: 50, maxLines: 2});
		
		var i = 0;
		layout.render("top", "left", function(text, x, y, w, css) {
			if(i == 1) {
				strictEqual(text.substring(text.length - 3), "...", "three dots added");
			}
			i++;
		});
		
		strictEqual(i, 2, "maxLines option works");

		var layout = flow.layout({width: 50, maxLines: 2, useThreeDots: false});
		
		i = 0;
		layout.render("top", "left", function(text, x, y, w, css) {
			if(i == 1) {
				ok(text.substring(text.length - 3) != "...", "three dots disabling works");
			}
			i++;
		});
		

		layout = flow.layout({width: 50});
		var lastText;
		layout.render("top", "left", function(text, x, y, w, css) {
			lastText = text;
		});
		ok(lastText.substring(lastText.length - 3) == "zzz", "No maxlines, no maxHeight => no cap, no dots");
		
		var lineHeight = layout.lineHeight;
		
		layout = flow.layout({width: 1});
		i = 0;
		layout.render("top", "left", function(text, x, y, w, css) {
			i++;
		});
		ok(i == 0, "low limit width (1) produces zero lines without crashing");
	});
	
	test("Correct overall behavious for just one line", function() {
		var flow = $.jsText.flow("Hey !", {});
		var layout = flow.layout({width: 1000, maxLines: 1});
		layout.render("left", "top", function(line, x, y, lineWidth) {
			equal(line, "Hey !");
		});
	})
	
	test("negative height", function() {
		var flow = $.jsText.flow("Hey!", {});
		var layout = flow.layout({width: 1000, height: -500});
		var i = 0;
		layout.render("top", "left", function(text, x, y, w, css) {
			i++;
		});
		ok(i == 0, "Negative height should produces zero lines without crashing");
	});
	
	test("negative width", function() {
		var flow = $.jsText.flow("Hey!", {});
		var layout = flow.layout({width: -500, height: 200});
		var i = 0;
		layout.render("top", "left", function(text, x, y, w, css) {
			i++;
		});
		ok(i == 0, "Negative width should produces zero lines without crashing");
	});
	
	test("flow is stateless", function() {
		var flow = $.jsText.flow("Hello, i'm now testing two (layout + render) on the same flow with the same parameters in a row. The two rendering should give exactly the same result.", {});
		
		var result1 = [];
		flow.layout({width: 50, maxLines: 3}).render("top", "left", function() {
			result1.push(arguments);
		});
		
		var result2 = [];
		flow.layout({width: 50, maxLines: 3}).render("top", "left", function() {
			result2.push(arguments);
		});

		deepEqual(result1, result2, "Layout + Rendering gives the same result two times in a row with the same parameters");
	});

	test("layout is stateless", function() {
		var flow = $.jsText.flow("Hello, i'm now testing two render on the same layout with the same parameters in a row. The two rendering should give exactly the same result.", {});
		var layout = flow.layout({width: 50, maxLines: 3});
		
		var result1 = [];
		layout.render("top", "left", function() {
			result1.push(arguments);
		});
		
		var result2 = [];
		layout.render("top", "left", function() {
			result2.push(arguments);
		});

		deepEqual(result1, result2, "Rendering gives the same result two times in a row with the same parameters");
	});
});