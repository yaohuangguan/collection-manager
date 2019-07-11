CREATE TABLE song (
    id serial PRIMARY KEY,
    name text,
    rating INTEGER, 
    publish_year INTEGER
)
;
CREATE TABLE artists (
    id serial PRIMARY KEY,
   artist_name text,
   artist_story text

);
CREATE TABLE artists_song(
    id serial,
    artists_id integer REFERENCES artists(id),
    songs_id integer REFERENCES song(id)
);
CREATE TABLE users (
    id serial PRIMARY KEY,
    username character varying(255) UNIQUE,
    email character varying(255),
    password character varying(255)
)

INSERT INTO artists (first_name, last_name) VALUES ('Eason','Chen'),('JJ','Lin'),('杰伦','周');
INSERT INTO song (name) VALUES ('love'),('flying without wings'),('爱情转移'),('单车'),('可惜没如果'),('彩虹');
INSERT INTO artists (artistName) VALUES ('Eason Chen', 'JJ Lin', '周杰伦', '周华健','五月天')