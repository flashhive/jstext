

Everything is here: <a href="http://www.samuelrossille.com/home/jstext.html">http://www.samuelrossille.com/home/jstext.html<a>


<h2>Overview</h2>
      <p><strong>jsText</strong> is a small library made to modelize and handle text rendering 
        at letter level in javascript. Why this ?</p>
      <ul>
        <li>Multiline text-overflow: ellipsis</li>
        <li>Multiline text with technologies that does not support it: 
          SVG, Canvas for example</li>
        <li>Have exactly the same line breaks in your SVG text, 
          in your HTML rendering, and in your PDF export for example</li>
        <li>More generally, precicely control and monitor the rendering of the text in your application or page.</li>
      </ul>
      <h2>Demo!</h2>
      <p>Here is an example of what you can do. Resize the box to see text layout update. 
        Note the three dots at the end of the text, and the performance of the layout update.</p>
      <br>
      
      <h2>Code sample</h2>
      <p>What you would typically write:</p>
      
      
      <pre class="brush: js">
// this how we create a Flow

var flow = $.jsText.flow("The text on which we want to work.", {
  "font-family": "Verdana, Helvetica, Arial, sans-serif",
	"font-size": "1em"
});

// "flow" contains the words and letters metrics information and we
// can perform as many layout as we want with the same flow. 

// now let's do a layout in a rectangular 50 x 50 square.

var layout = flow.layout({width: 50, height: 50});  

// "layout" contains the information about how to split the text into lines
// to make it fit in a 50 x 50 square.

// Note that at this point we are still independent of the rendering-material 
// (SVG, HTML, PDF, Canvas, VML ?)

// Now we want to show something ... in html for example.
    
layout.render("top", "left", function(line, x, y) { // this anonymous function will be 
    target.append($("&lt;div/&gt;").css({                 // called for each chunk of text
        position: "absolute",
        x: x + "px",
        y: y + "px",
    }));
});
</pre>
      
      <h2>More about the concepts</h2>
      <p>A <strong>flow</strong> is an object that contains all the metric information related to a text. 
        It contains the measures of each letter and word. 
        Creating it from a string is the expensive operation. 
        It makes no assumption about how the text will be displayed. 
        The text's basic elements measures are the information that can be used 
        to create a <strong>layout</strong> from a flow. The <strong>layout()</strong> method of a <strong>flow</strong>
        implements this operation.</p>
      <p>The <strong>layout</strong> specifies how the text is split into several lines, 
        and where these lines should be on a media. The <strong>layout</strong> doesn't require any assumptions 
        on the final rendring media. Basically it's just a collection of chunks of text 
        with placement information on a bidimensionnal space. 
        To actually display the original text with this <strong>layout</strong> on a media, 
        we need to perform a media-dependent <strong>rendering</strong>.</p>
      <p>The <strong>render()</strong> method of a <strong>layout</strong> allows to perfrom the 
        actual <strong>rendering</strong> through 
        a user supplied function that will be called for each chunk of text, 
        with the string to display and the placement information for each of them.</p>
