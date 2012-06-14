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
	
	test("flow", function() {
		var flow = $.jsText.flow("Hello kqjsd jsdq sdjklqsjd qksjd qksdjqksjd qkjdqklsdjqklsdj qldj qsl", {});
		
		var layout = flow.layout({width: 50, maxLines: 2});
		strictEqual(layout.lines.length, 2, "maxLines option works");
		strictEqual(layout.lines[1].substring(layout.lines[1].length - 3), "...", "three dots added");

		var layout = flow.layout({width: 50, maxLines: 2, useThreeDots: false});
		ok(layout.lines[1].substring(layout.lines[1].length - 3) != "...", "three dots disabling works");

		layout = flow.layout({width: 50});
		ok(layout.lines[layout.lines.length - 1].substring(layout.lines[layout.lines.length - 1].length - 3) != "...", "no cap, no dots");
		
		var lineHeight = layout.lineHeight;
		
		layout = flow.layout({width: 50, height: lineHeight * 3 + 1});
		strictEqual(layout.lines.length, 3, "height option works near ceil");

		layout = flow.layout({width: 50, height: lineHeight * 4 - 1});
		strictEqual(layout.lines.length, 3, "height option works near floor");
		
		layout = flow.layout({width: 50, maxLines: 2, height: lineHeight * 4 - 1});
		strictEqual(layout.lines.length, 2, "height option works near floor");
		
		layout = flow.layout({width: 1});
		deepEqual(layout.lines, [], "low limit width (1) produces zero lines without crashing");
	});
	
	test("unneeded dots", function() {
		var flow = $.jsText.flow("Hey!", {});
		var layout = flow.layout({width: 1000, maxLines: 1});
		layout.render("left", "top", function(line, x, y, lineWidth) {
			equal(line, "Hey!");
		});
	})
	
	test("negative height", function() {
		var flow = $.jsText.flow("Hey!", {});
		var layout = flow.layout({width: 1000, height: -500});
		equal(layout.lines.length, 0, "Layout should have zero lines");
	});
	
	test("negative width", function() {
		var flow = $.jsText.flow("Hey!", {});
		var layout = flow.layout({width: -500, height: 200});
		equal(layout.lines.length, 0, "Layout should have zero lines");
	});
});