#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "date"
require "fileutils"
require "nokogiri"
require "open3"
require "pathname"
require "uri"

SOURCE = Pathname(ARGV.fetch(0, "test_source.html")).expand_path
OUTPUT = Pathname(ARGV.fetch(1, "test.html")).expand_path
ASSET_DIR = Pathname(ARGV.fetch(2, "test_assets")).expand_path

X_ORIGIN = "https://x.com"

def clean_text(node)
  node.text.gsub(/[\u00a0\s]+/, " ").strip
end

def nearest_tweet(node)
  node.ancestors("article[data-testid='tweet']").first
end

def absolute_x_url(path)
  return path if path.nil? || path.empty? || path.start_with?("http://", "https://")

  "#{X_ORIGIN}#{path.start_with?("/") ? path : "/#{path}"}"
end

def media_extension(url)
  uri = URI.parse(url)
  params = URI.decode_www_form(uri.query.to_s).to_h
  format = params["format"]&.downcase
  return ".jpg" if %w[jpg jpeg].include?(format)
  return ".png" if format == "png"
  return ".webp" if format == "webp"

  ext = File.extname(uri.path).downcase
  %w[.jpg .jpeg .png .webp .gif].include?(ext) ? ext : ".jpg"
rescue URI::InvalidURIError
  ".jpg"
end

def highest_quality_url(url)
  url
end

class MediaStore
  def initialize(directory, output_directory)
    @directory = directory
    @output_directory = output_directory
    @directory.mkpath
    @seen = {}
    @counter = 0
  end

  def fetch(url)
    return nil if url.nil? || url.empty?
    return @seen[url] if @seen.key?(url)

    @counter += 1
    filename = format("media-%02d%s", @counter, media_extension(url))
    destination = @directory / filename
    download_url = highest_quality_url(url)
    _stdout, stderr, status = Open3.capture3(
      "curl", "-L", "--fail", "--silent", "--show-error",
      "--max-time", "30", download_url, "-o", destination.to_s
    )
    unless status.success?
      warn "Could not download #{url}: #{stderr.strip}"
      destination.delete if destination.exist?
      @seen[url] = url
      return url
    end

    relative = destination.relative_path_from(@output_directory).to_s
    @seen[url] = relative
  end

end

def tweet_identity(tweet)
  user_node = tweet.css("[data-testid='User-Name']").find { |node| nearest_tweet(node) == tweet }
  user_text = user_node ? clean_text(user_node) : "Quoted post"
  handle = user_text[/@[A-Za-z0-9_]+/] || ""
  display_name = handle.empty? ? user_text : user_text.split(handle, 2).first.strip
  [display_name, handle]
end

def tweet_time_and_url(tweet)
  time = tweet.css("time").find { |node| nearest_tweet(node) == tweet }
  href = time&.parent&.[]("href")
  href ||= tweet.css("a[href*='/status/']").find { |node| nearest_tweet(node) == tweet }&.[]("href")
  date = if time && time["datetime"]
           DateTime.parse(time["datetime"]).strftime("%-d %B %Y")
         else
           ""
         end
  [date, absolute_x_url(href.to_s)]
rescue Date::Error
  ["", absolute_x_url(href.to_s)]
end

def image_urls(container)
  container.css("[data-testid='tweetPhoto'] img").map { |image| image["src"] }.compact.uniq
end

def render_figure(url, store, alt:, caption: nil, css_class: nil)
  src = store.fetch(url)
  return "" unless src

  class_attr = css_class ? %( class="#{CGI.escapeHTML(css_class)}") : ""
  caption_html = caption ? "<figcaption>#{CGI.escapeHTML(caption)}</figcaption>" : ""
  <<~HTML
    <figure#{class_attr}>
      <img src="#{CGI.escapeHTML(src)}" alt="#{CGI.escapeHTML(alt)}" loading="lazy" />
      #{caption_html}
    </figure>
  HTML
end

def render_embedded_post(section, store)
  tweet = section.at_css("article[data-testid='tweet']")
  return "" unless tweet

  display_name, handle = tweet_identity(tweet)
  date, url = tweet_time_and_url(tweet)
  text_node = tweet.css("[data-testid='tweetText']").find { |node| nearest_tweet(node) == tweet }
  text = text_node ? clean_text(text_node) : ""
  images = image_urls(tweet)
  video = tweet.at_css("video")
  poster = video&.[]("poster")

  media_html = images.each_with_index.map do |image_url, index|
    render_figure(
      image_url,
      store,
      alt: "Image #{index + 1} attached to the quoted post by #{display_name}",
      css_class: images.length > 1 ? "post-image post-image-grid" : "post-image"
    )
  end.join

  if poster
    media_html += render_figure(
      poster,
      store,
      alt: "Video preview from the quoted post by #{display_name}",
      caption: "Video available in the original post.",
      css_class: "post-image"
    )
  end

  author_line = [display_name, handle].reject(&:empty?).join(" · ")
  author_html = if url.empty?
                  CGI.escapeHTML(author_line)
                else
                  %(<a href="#{CGI.escapeHTML(url)}">#{CGI.escapeHTML(author_line)}</a>)
                end

  <<~HTML
    <aside class="embedded-post">
      <p class="post-author">#{author_html}#{date.empty? ? "" : " · #{CGI.escapeHTML(date)}"}</p>
      <blockquote><p>#{CGI.escapeHTML(text)}</p></blockquote>
      <div class="post-media">#{media_html}</div>
    </aside>
  HTML
end

def source_metadata(outer_tweet)
  display_name, handle = tweet_identity(outer_tweet)
  date, url = tweet_time_and_url(outer_tweet)
  [display_name, handle, date, url]
end

doc = Nokogiri::HTML(SOURCE.read)
outer_tweet = doc.at_css("article[data-testid='tweet']") or abort "Could not find the X article container"
read_view = outer_tweet.at_css("article[data-testid='twitterArticleReadView']") or abort "Could not find the X long-form article"
content_root = read_view.at_css("[data-testid='longformRichTextComponent'] [data-contents='true']") or abort "Could not find article blocks"

title = clean_text(read_view.at_css("[data-testid='twitter-article-title']"))
author, handle, publication_date, source_url = source_metadata(outer_tweet)

ASSET_DIR.rmtree if ASSET_DIR.exist?
store = MediaStore.new(ASSET_DIR, OUTPUT.dirname)

hero_url = read_view.at_css("[data-testid='tweetPhoto'] img")&.[]("src")
hero_html = hero_url ? render_figure(hero_url, store, alt: "Header image for #{title}", css_class: "hero") : ""

standalone_captions = {
  16 => "Frank Slootman, referenced in the adjacent text.",
  30 => "Devotional artwork acquired by the author.",
  33 => "Detail of the devotional artwork.",
  66 => "Closing image from the original article."
}

body_blocks = content_root.element_children.each_with_index.map do |block, index|
  if block.name == "section"
    embedded = render_embedded_post(block, store)
    next embedded unless embedded.empty?

    urls = image_urls(block)
    urls.each_with_index.map do |url, image_index|
      render_figure(
        url,
        store,
        alt: "Article image #{image_index + 1}",
        caption: standalone_captions[index],
        css_class: "article-image"
      )
    end.join
  else
    text = clean_text(block)
    text.empty? ? "" : "<p>#{CGI.escapeHTML(text)}</p>"
  end
end.join("\n")

byline = [author, handle].reject(&:empty?).join(" · ")
description = "A clean, offline-focused reading version of a user-supplied X article export."

html_output = <<~HTML
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="#{CGI.escapeHTML(description)}" />
    <title>#{CGI.escapeHTML(title)} — #{CGI.escapeHTML(author)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * { box-sizing: border-box; }
      html { background: #fbfaf7; }
      body {
        color: #17191a;
        background: #fbfaf7;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 20px;
        line-height: 1.58;
        margin: 0;
      }
      main {
        max-width: 43rem;
        margin: 0 auto;
        padding: 5rem 1.5rem 7rem;
      }
      header { margin-bottom: 2.6rem; }
      .kicker,
      .byline,
      .source-note,
      .post-author,
      figcaption {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      }
      .kicker {
        color: #17647f;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.15em;
        margin: 0 0 0.9rem;
        text-transform: uppercase;
      }
      h1 {
        font-size: 3.6rem;
        font-weight: 500;
        letter-spacing: -0.045em;
        line-height: 0.98;
        margin: 0 0 1.3rem;
      }
      .byline {
        color: #5c6265;
        font-size: 0.88rem;
        line-height: 1.45;
        margin: 0;
      }
      a { color: #17647f; text-decoration-thickness: 0.06em; text-underline-offset: 0.12em; }
      article > p { margin: 0 0 1.12em; }
      article > p:first-of-type::first-letter {
        color: #17647f;
        float: left;
        font-size: 4.1em;
        line-height: 0.78;
        padding: 0.11em 0.08em 0 0;
      }
      figure { margin: 2rem 0; break-inside: avoid; }
      img {
        display: block;
        height: auto;
        margin: 0 auto;
        max-width: 100%;
      }
      .hero { margin: 2.2rem 0 3.2rem; }
      .hero img { width: 100%; }
      figcaption {
        color: #5c6265;
        font-size: 0.72rem;
        line-height: 1.4;
        margin-top: 0.55rem;
      }
      .embedded-post {
        background: #f0f2f2;
        border-left: 0.2rem solid #17647f;
        margin: 2rem 0 2.2rem;
        padding: 1rem 1.1rem 1.1rem;
        break-inside: avoid;
      }
      .post-author {
        color: #5c6265;
        font-size: 0.72rem;
        font-weight: 650;
        line-height: 1.4;
        margin: 0 0 0.65rem;
      }
      blockquote { margin: 0; }
      blockquote p { font-size: 0.91em; line-height: 1.48; margin: 0; }
      .post-media {
        display: grid;
        gap: 0.7rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 0.9rem;
      }
      .post-media:empty { display: none; }
      .post-image { margin: 0; }
      .post-image:only-child { grid-column: 1 / -1; }
      .source-note {
        border-top: 1px solid #b9c3c7;
        color: #5c6265;
        font-size: 0.72rem;
        line-height: 1.5;
        margin-top: 4rem;
        padding-top: 1rem;
      }
      @media (max-width: 36rem) {
        body { font-size: 18px; }
        h1 { font-size: 2.7rem; }
        main { padding: 3rem 1.1rem 5rem; }
        .post-media { grid-template-columns: 1fr; }
      }
      @media print {
        html, body { background: #fff; }
        body { font-size: 11pt; }
        main { max-width: none; padding: 0; }
        a { color: inherit; text-decoration: none; }
        .embedded-post { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="kicker">Essay · X Articles</p>
        <h1>#{CGI.escapeHTML(title)}</h1>
        <p class="byline">#{CGI.escapeHTML(byline)}#{publication_date.empty? ? "" : " · #{CGI.escapeHTML(publication_date)}"}</p>
      </header>
      #{hero_html}
      <article>
        #{body_blocks}
      </article>
      <footer class="source-note">
        <p>Reformatted from a user-supplied X article export. Article text and quoted posts are preserved; interface controls and engagement metrics were removed.</p>
        #{source_url.empty? ? "" : %(<p><a href="#{CGI.escapeHTML(source_url)}">View the original article on X</a></p>)}
      </footer>
    </main>
  </body>
  </html>
HTML

OUTPUT.write(html_output)
puts OUTPUT
